# Authorization Matrix

> **Snapshot del 2026-05-27.** La sorgente di verità sono le chiamate
> `validateAuth(request, ...)` nelle `route.ts` (API) e
> `validateAuthFromServerSession(...)` nelle `page.tsx` (server components),
> più il matcher di [middleware.ts](../middleware.ts).
> In caso di dubbio leggi il codice — questa matrice può essere out-of-date.
>
> **Quando aggiungi/modifichi una rotta protetta, aggiorna questo file nello stesso commit.**

## Legenda

| Simbolo | Significato |
|---|---|
| ✅ | Accesso consentito (logica di business permettendo) |
| ⏳ | Pagina mostra il componente `PendingApproval` (utente NUOVO in attesa di approvazione admin) |
| ❌ | Pagina mostra `AccessDenied` (banner rosso) |
| 🔒 | API ritorna 403 Forbidden |
| ↪ | Middleware redirige a `/auth/login?callbackUrl=...` (307) |

I ruoli sono definiti in `prisma/schema.prisma` (`enum UserRole`):
- **NUOVO** — utente appena registrato (Google o credenziali), in attesa di approvazione admin
- **CUSTOMER** — utente approvato, può fare acquisti
- **ADMIN** — gestisce utenti, prodotti, inventory, ordini
- **GUEST** — non autenticato (nessun token)

## Pagine

| Path | GUEST | NUOVO | CUSTOMER | ADMIN |
|---|---|---|---|---|
| `/` | ✅ | ✅ | ✅ | ✅ |
| `/auth/login`, `/auth/register`, `/auth/error` | ✅ | ✅ | ✅ | ✅ |
| `/shop` | ✅ | ✅ | ✅ | ✅ |
| `/shop/products/[id]` | ↪ | ⏳ | ✅ | ✅ |
| `/shop/cart` | ↪ | ⏳ | ✅ | ✅ |
| `/shop/checkout` | ↪ | ⏳ | ✅ | ✅ |
| `/shop/order-confirmation/[id]` | ↪ | ❌ | ✅ (solo proprio) | ✅ |
| `/dashboard` | ↪ | ⏳ | ✅ | ✅ |
| `/dashboard/orders` | ↪ | ❌ | ✅ | ✅ |
| `/dashboard/admin/users` | ↪ | ❌ | ❌ | ✅ |
| `/dashboard/admin/products` | ↪ | ❌ | ❌ | ✅ |
| `/dashboard/admin/inventory` | ↪ | ❌ | ❌ | ✅ |
| `/dashboard/admin/orders` | ↪ | ❌ | ❌ | ✅ |
| `/user/changepassword` | ↪ | ✅ (cred) / msg Google (oauth) | ✅ (cred) / msg Google (oauth) | ✅ (cred) / msg Google (oauth) |

## API

| Method + Path | GUEST | NUOVO | CUSTOMER | ADMIN |
|---|---|---|---|---|
| `POST /api/auth/register` | ✅ | ✅ | ✅ | ✅ |
| `* /api/auth/[...nextauth]` | ✅ | ✅ | ✅ | ✅ |
| `GET\|POST\|PATCH\|DELETE /api/cart` | ↪ | 🔒 | ✅ | ✅ |
| `GET\|POST /api/cart/reserve` | ↪ | 🔒 | ✅ | ✅ |
| `POST /api/cart/release` | ↪ | 🔒 | ✅ | ✅ |
| `GET\|POST /api/orders` | ↪ | 🔒 | ✅ | ✅ |
| `GET /api/orders/[id]` | ↪ | 🔒 | ✅ (solo proprio) | ✅ |
| `GET\|POST /api/products` | ↪ | 🔒 | 🔒 | ✅ |
| `GET\|PUT\|DELETE /api/products/[id]` | ↪ | 🔒 | 🔒 | ✅ |
| `DELETE /api/admin/products/bulk` | ↪ | 🔒 | 🔒 | ✅ |
| `PUT /api/inventory/[id]` | ↪ | 🔒 | 🔒 | ✅ |
| `GET\|POST /api/admin/users` | ↪ | 🔒 | 🔒 | ✅ |
| `PUT\|DELETE /api/admin/users/[id]` | ↪ | 🔒 | 🔒 | ✅ |
| `POST /api/admin/users/bulk` | ↪ | 🔒 | 🔒 | ✅ |
| `GET\|POST /api/admin/orders` | ↪ | 🔒 | 🔒 | ✅ |
| `GET /api/admin/orders/[id]` | ↪ | 🔒 | ✅ (solo proprio) | ✅ |
| `PUT\|DELETE /api/admin/orders/[id]` | ↪ | 🔒 | 🔒 | ✅ |
| `POST\|DELETE /api/admin/orders/bulk` | ↪ | 🔒 | 🔒 | ✅ |
| `POST /api/user/changepassword` | ↪ | ✅ (cred) / 400 (oauth) | ✅ (cred) / 400 (oauth) | ✅ (cred) / 400 (oauth) |

## Note

- **GUEST + API protette**: il middleware intercetta la richiesta nel matcher e fa
  307 verso `/auth/login` *prima* che il route handler venga eseguito. Quindi un
  `fetch("/api/cart", { method: "POST" })` da non-autenticato riceve un redirect,
  non un JSON 401. Le `validateAuth(...)` interne fungono da seconda linea di difesa.

- **Ownership check oltre al ruolo** — alcune route passano la guard di ruolo ma poi
  filtrano per `userId`:
  - `GET /api/orders/[id]` — un CUSTOMER può leggere solo `order.userId === auth.user.id`.
  - `GET /api/admin/orders/[id]` — stessa logica per CUSTOMER.
  - Pagina `/shop/order-confirmation/[id]` — idem.

- **`PendingApproval` è applicato selettivamente.** Pagine che lo mostrano:
  `/shop/cart`, `/shop/checkout`, `/shop/products/[id]`, `/dashboard`. Il resto
  (`/dashboard/orders`, area admin, `order-confirmation`) ricade su
  `AccessDenied` standard.

- **Cambio password OAuth** — `POST /api/user/changepassword` ritorna 400 con
  messaggio "usa account Google" se `User.password === null`, anche per un utente
  con ruolo valido. La pagina `/user/changepassword` mostra il banner blu prima
  ancora di renderizzare il form.

- **Rotte completamente pubbliche** (non nel matcher di `middleware.ts`):
  - tutte le route `/api/auth/*` (gestite da NextAuth)
  - `/`, `/auth/*`, `/shop` (catalogo)
  - asset statici (`/_next/*`, file con estensione)
