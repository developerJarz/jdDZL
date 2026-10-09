# Customer and staff dashboards

Customers sign in at `/auth/login` and manage their account at `/account`. Each tab has a direct URL, for example `/account?tab=orders` or `/account?tab=support`.

The account includes order search and status filters, delivery and payment history, printable invoices, cancellation before processing, verified purchase reviews, saved addresses and default address selection, saved products, support/return/warranty conversations, profile editing and password changes. Status and support replies refresh every 30 seconds while visible, on window focus, or through the Refresh button. Costs and internal staff details are excluded from customer order responses.

Staff sign in at `/admin/login` or `/staff/login`. Their landing page is `/admin/workspace`; `/staff` also leads there. The workspace shows permitted queues and assigned orders. Every staff account has `/admin/profile` for their own name, optional Bangladesh phone number, password and sign out. Changing a password revokes other sessions. Existing management pages and server permissions remain in use. `/admin/overview` opens the overview when the role has that permission; owners keep `/admin` as their default overview.

The provided test staff account uses the Store manager preset. It can manage orders/POS, customers, stock/products, purchases/expenses/reports, storefront content, marketing and support. Store settings, integrations and staff administration remain owner-only for editing. Read-only store configuration is available to order/POS roles for delivery calculations.

## Test accounts

Run `node scripts/create-test-accounts.cjs --create` to create the two explicitly marked demo accounts in the configured database. It preserves existing owner accounts, detects conflicting emails and reuses valid saved demo credentials. It does not seed orders or change product stock.

The credentials are saved in `.test-credentials.txt` and `.dashboard-test-credentials.json`, both ignored by Git. Neither file belongs in the repository or deployment bundle. The passwords are generated individually rather than hardcoded in source. The owner can disable the staff account through Staff accounts, or disable the customer through Customers.

## Verification

Run `npm test`, `npm run typecheck`, `npm run lint` and `npm run build` for local checks.

Connected and browser tests use a separate database on the configured MongoDB cluster. Integration credentials and existing orders are not copied. Production stock and customer transactions remain untouched.

1. Create the demo accounts as above.
2. Run `node tests/dashboard-environment.cjs prepare`.
3. In PowerShell, initialize the isolated database:
   ```powershell
   $env:MONGODB_DB = (Get-Content test-results/dashboard/environment.json | ConvertFrom-Json).database
   npm run db:setup
   Remove-Item Env:MONGODB_DB
   ```
4. Build the application, then run `node tests/start-dashboard-server.cjs` in a separate terminal.
5. Run `node tests/run-dashboard-checks.cjs`. This runs backend, operations, customer workflows, dashboard permissions and both browser suites sequentially. Google Chrome is used headlessly.
6. Stop the test server, then run `node tests/dashboard-environment.cjs cleanup`. Cleanup validates the isolated database name and checks the original product, stock and order counts against the recorded baseline.

Logs and desktop/mobile screenshots are stored under the ignored `test-results/dashboard/` folder. The browser suite tests real profile/password mutations only in the isolated database and restores copied demo credentials afterwards.

Payments, courier booking, SMS delivery and external tracking still require valid provider configuration. Tests cover local workflows and configuration behavior; they do not send real payments, refunds or messages to customers.
