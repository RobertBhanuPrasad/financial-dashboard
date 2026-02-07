'use server';
import { signIn } from "@/auth";
import { AuthError } from "next-auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import postgres from "postgres";
import {z} from "zod"
import bcrypt from 'bcrypt';

const FormSchema = z.object({
    id: z.string(),
    customerId: z.string({
        invalid_type_error: 'Please select the customer id'
    }),
    amount: z.coerce.number().gt(0, {message: 'Please enter the amount greater than $0'}),
    status: z.enum(['pending', 'paid'], {
        invalid_type_error: 'Please select an invoice status'
    }),
    date: z.string(),
})

export type State = {
    errors?: {
        customerId?: string[];
        amount?: string[];
        status?: string[];
    };
    message?: string | null;
};

export async function authenticate(
    prevState: string | undefined,
    formData: FormData,
) {
    try {
        await signIn('credentials', formData);
    } catch (error) {
        if (error instanceof AuthError) {
            switch (error.type) {
                case 'CredentialsSignin':
                    return 'Invalid credentials.';
                default:
                    return 'Something went wrong.';
            }
        }
        throw error;
    }
}

const createInvoice = FormSchema.omit({id: true, date: true})

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require'})

export default async function createInvoices(prevState: State, formData: FormData) {
    const validatedFields = createInvoice.safeParse({
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status'),
    });

    if(!validatedFields.success){
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: 'Missing fields, Failed to create the invoice'
        }
    }

    // Prepare data for insertion into the database
    const { customerId, amount, status } = validatedFields.data;
    const amountInCents = amount * 100;
    const date = new Date().toISOString().split('T')[0];

    try{
    await sql`
    INSERT INTO invoices (customer_id, amount, status, date)
    VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
    `
} catch(error){
    console.log(error)
    // return {
    //     message: "Database error: Failed to create the user"
    // }
}
revalidatePath('/dashboard/invoices')
redirect('/dashboard/invoices')
}

const UdpateInvoice = FormSchema.omit({id: true, date: true});

export async function udpateInvoices(id: string, formData: FormData) {
    const validatedFields = UdpateInvoice.safeParse({
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status'),
    })

    if(!validatedFields.success){
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: 'Missing fields, Failed to update the invoice'
        }
    }
    const {amount, customerId, status} = validatedFields.data;
    const amountInCents = amount*100;

    try{
        await sql`
        UPDATE invoices
        SET customer_id=${customerId}, amount=${amountInCents}, status=${status}
        WHERE id=${id}
        `
    }catch(error){
        console.log(error)
        // return {
        //     message: "Database error: Failed to update the user"
        // }
    }

     revalidatePath('/dashboard/invoices');
     redirect('/dashboard/invoices');
}

export async function deleteInvoice(id: string){
    try{
    await sql`
    DELETE FROM invoices WHERE id=${id}
    `;
    }catch(error){
        console.log(error)
        //th form data just say to delete but we are returning a object as like so it is throwoing and eror so that we are commenting the below one 
        // return {
        //     message: "Database error: Failed to delete the user"
        // }
    }
    revalidatePath('/dashboard/invoices')
}

export async function createAccount(data: { name: string; email: string; password: string; confirmPassword: string }) {
  const { name, email, password, confirmPassword } = data;

  if (!name || !email || !password || !confirmPassword) {
    return {
      message: 'All fields are required',
      status: 400,
    };
  }

  if (password !== confirmPassword) {
    return {
      message: 'Passwords do not match',
      status: 400,
    };
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await sql`
      INSERT INTO users (name, email, password)
      VALUES (${name}, ${email}, ${hashedPassword})
    `;
    return {
      message: 'Account created successfully',
      status: 201,
    };
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === '23505') { 
      return {
        message: 'Email already exists',
        status: 409,
      };
    }
    console.error('Error creating account:', error);
    return {
      message: 'Internal server error',
      status: 500,
    };
  }
}
