import { supabase } from './supabase.js';

const applicationKey = 'upstart.applicationDraft';

export function readApplicationDraft() {
  try {
    return JSON.parse(sessionStorage.getItem(applicationKey) || 'null');
  } catch {
    return null;
  }
}

export function clearApplicationDraft() {
  sessionStorage.removeItem(applicationKey);
}

export async function submitApplicationDraft(user) {
  const draft = readApplicationDraft();
  if (!draft) return { error: null, application: null };

  const { data, error } = await supabase.from('loan_applications').insert({
    user_id: user.id,
    first_name: draft.firstName,
    last_name: draft.lastName,
    email: user.email,
    phone: draft.phone,
    address: draft.address,
    parish: draft.parish,
    amount: Number(draft.amount),
    term: Number(draft.term),
    purpose: draft.purpose,
    employment: draft.employment,
    bank: draft.bank,
    monthly_income: Number(draft.income),
    pay_date: draft.payDate,
    status: 'pending',
  }).select().single();

  if (!error) clearApplicationDraft();
  return { data, error, application: draft };
}