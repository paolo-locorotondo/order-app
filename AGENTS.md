<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Authorization matrix

`docs/AUTHORIZATION_MATRIX.md` documenta chi può accedere a quali pagine/API. **Quando aggiungi o modifichi una rotta protetta** (qualsiasi cambio a `validateAuth`, `validateAuthFromServerSession`, al matcher di `middleware.ts`, o aggiunta di nuove pagine/route handler), aggiorna la matrice nello stesso commit. Un file out-of-date è peggio di nessun file.
