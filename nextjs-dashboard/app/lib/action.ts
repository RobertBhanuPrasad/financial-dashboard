'use server';
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import postgres from "postgres";
import {z} from "zod"

const FormSchema = z.object({
    id: z.string(),
    customerId: z.string(),
    amount: z.coerce.number(),
    status: z.enum(['pending', 'paid']),
    date: z.string(),
})

const createInvoice = FormSchema.omit({id: true, date: true})

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require'})

export default async function createInvoices(formData: FormData) {
    const {customerId, amount, status} = createInvoice.parse({
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status'),
    });

    const amountInCents = amount * 100;
    const date = new Date().toISOString().split('T')[0]

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
    const { customerId, amount, status } = UdpateInvoice.parse({
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status'),
    })

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
