'use server';
import {z} from "zod"

const FormSchema = z.object({
    id: z.string(),
    customerId: z.string(),
    amount: z.coerce.number(),
    status: z.enum(['pending', 'paid']),
    date: z.string(),
})

const createInvoice = FormSchema.omit({id: true, date: true})

export default async function createInvoices(formData: FormData) {
    const {customerId, amount, status} = createInvoice.parse({
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status'),
    });
    // Test it out:
    console.log(customerId, amount, status, "bhanuformdata");
}