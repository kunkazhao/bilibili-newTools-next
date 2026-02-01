import { apiRequest } from "@/lib/api"
import type { Account } from "@/types/account"

export const fetchAccounts = () =>
  apiRequest<{ accounts: Account[] }>("/api/accounts")

export const createAccount = (payload: { name: string }) =>
  apiRequest<{ account: Account }>("/api/accounts", {
    method: "POST",
    body: JSON.stringify(payload),
  })

export const updateAccount = (id: string, payload: { name: string }) =>
  apiRequest<{ account: Account }>(`/api/accounts/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  })

export const deleteAccount = (id: string) =>
  apiRequest(`/api/accounts/${id}`, {
    method: "DELETE",
  })
