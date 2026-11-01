# CivicFix Production Deployment Checklist

## 1. Required Production Environment Variables
| Variable | Description | Requirement |
| :--- | :--- | :--- |
| `SPRING_PROFILES_ACTIVE` | Active Spring profile | Set to `prod` |
| `DB_HOST` | PostgreSQL hostname / IP | e.g. `postgres.internal` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_NAME` | Database name | `civicfix_prod` |
| `DB_USER` | Database user | `civicfix_app` |
| `DB_PASSWORD` | Database password | **Must NOT be** `civicfix_dev_password_only` |
| `FRONTEND_ORIGIN` | Allowed CORS origin | e.g. `https://civicfix.chennai.gov.in` |
| `ALLOW_SEED_ACCOUNTS` | Seed account policy | Default `false` (disables V2 personas) |

## 2. Pre-Deployment Repository Cleanliness
Before packaging or sharing the codebase:
- Remove local `.env` and `.env.*.local` files (keep `.env.example`).
- Purge local test uploads in `backend/uploads/` and `uploads/`.
- Remove build outputs in `dist/` and `backend/target/`.

## 3. Creating the First Real Administrator
In production profile (`SPRING_PROFILES_ACTIVE=prod`), all 4 seeded accounts from V2 are automatically set to `DISABLED`. To create the first active administrator:

1. Generate a BCrypt hash (strength 10+) for your secure password.
2. Execute the following SQL in PostgreSQL:
   ```sql
   INSERT INTO users (id, full_name, email, phone, password_hash, account_status, department, ward)
   VALUES (gen_random_uuid(), 'System Administrator', 'admin@metro.gov', '+919876543210', '<BCRYPT_HASH>', 'ACTIVE', 'Platform Security', 'Headquarters');

   INSERT INTO user_roles (user_id, role_id)
   SELECT u.id, r.id FROM users u, roles r WHERE u.email = 'admin@metro.gov' AND r.name = 'ADMIN';
   ```
3. Alternatively, register via `/api/auth/register`, then elevate the account:
   ```sql
   INSERT INTO user_roles (user_id, role_id)
   SELECT u.id, r.id FROM users u, roles r WHERE u.email = 'your.email@metro.gov' AND r.name = 'ADMIN';
   ```

## 4. Progressive Web App (PWA) & Mandatory HTTPS
Service workers and the native PWA application installation flow require a secure context:
- **Mandatory HTTPS**: In production, CivicFix MUST be served over HTTPS (TLS 1.2+). Modern browsers strictly block service worker registration, offline precaching, and the `beforeinstallprompt` install banner over plain HTTP (only `localhost` is permitted as a development exception).
- **SSL Termination**: Configure Nginx, AWS ALB, or your Cloudflare ingress with automated TLS certificates (e.g. Let's Encrypt).

