export type BlueLinkAccountRef = { id: string }

export function resolveSelectedAccountId(
  accounts: BlueLinkAccountRef[],
  cachedId?: string | null
) {
  if (!accounts.length) return ""
  if (cachedId) {
    const match = accounts.find((account) => account.id === cachedId)
    if (match) return match.id
  }
  return accounts[0].id
}