const support = '<p><a href="/support">Send a support request</a> with the product name or order number if you need help with a particular purchase.</p>';
const page = (intro: string, sections: [string, string][]) =>
  `<p>${intro}</p>${sections.map(([title, text]) => `<h2>${title}</h2><p>${text}</p>`).join("")}${support}`;

/** Original shopping information. Product-specific arrangements need confirmation. */
export const policyContent: Record<string, string> = {
  faq: page("A few useful starting points for shopping at dazzle.bd.", [
    ["How do I choose a product?", "Search for a model or browse by category. Narrow the list by price and brand, then put your shortlisted models on the comparison page. Check the selected colour, storage, compatibility and stock before ordering."],
    ["Where can I see my total?", "Checkout calculates the delivery charge and any accepted coupon against the current order. Review the final amount and delivery details before placing it."],
    ["How can I follow my order?", "Sign in to the account used at checkout to see your orders and recorded progress. Keep the order number handy when contacting support."],
    ["Can I ask about an unlisted device?", "Use the pre-order enquiry form to share the model and your contact details. An enquiry requests information; it does not confirm a reservation, price or delivery date."],
  ]),
  delivery_policy: page("Review the delivery options and charges for your dazzle.bd order before confirming your purchase.", [
    ["Your delivery details", "Provide a complete address and a phone number where you can be reached. Check the area, building and delivery instructions before submitting the order."],
    ["Charges and timing", "The checkout summary shows the calculated delivery charge. Ask support about an address or special requirement before ordering. Delivery timing must be confirmed for the particular order."],
    ["Order updates", "Recorded order progress and courier information appear in your account when staff update them. Include your order number if you need a delivery update."],
  ]),
  warranty_policy: page("Warranty coverage can vary by model, variant and supplier. Confirm the coverage for the exact product you are buying.", [
    ["Before purchase", "Check any stated warranty details. Ask who handles service, what is covered and whether an additional protection plan is included in your order."],
    ["Requesting help", "Keep your invoice and device details. Open a support request from your account explaining the issue, when it appeared and any troubleshooting you have tried."],
    ["Service assessment", "Requests are reviewed against the coverage attached to the purchase. Repair, replacement and any charges depend on the applicable product terms; submitting a request does not establish eligibility."],
  ]),
  refund_policy: page("If something is wrong with an order, contact dazzle.bd with the order number and a clear explanation.", [
    ["What to include", "Identify the affected item and the reason for the request. Include photographs where useful and retain the invoice, packaging and accessories while staff review the issue."],
    ["Before sending an item back", "Ask for return instructions first. Staff need to confirm the reason, condition and product-specific terms before advising the next step."],
    ["Refund updates", "The method and timing need confirmation for the individual case. Your account records a completed refund after staff confirm it. A submitted request is not confirmation that repayment has occurred."],
  ]),
  exchange_policy: page("Tell us what you would like to change so we can check the item and available alternatives.", [
    ["Product exchanges", "Share your order number, the item received and the model or variant you prefer. Explain whether the item has been opened or used. Eligibility and availability need confirmation before an exchange is arranged."],
    ["Trade-in enquiries", "A trade-in is a separate request. Share your existing device's model and condition through the trade-in page. Valuation, acceptance and any price difference must be confirmed after review."],
  ]),
  cancellation_policy: page("If your plans change, contact dazzle.bd promptly with the number of the order you want to cancel.", [
    ["Before dispatch", "Staff will check the current status and whether cancellation is still possible. Send the request using the account or contact details used to place the order."],
    ["After dispatch", "An order already with a courier may require a different process. Ask support about the shipment status and the next available step."],
    ["Payments already made", "Cancellation and repayment are separate updates. Ask staff to explain the applicable refund process and check both updates in your account."],
  ]),
  pre_order_policy: page("A pre-order enquiry is a way to ask about a device or configuration that is not currently available to buy.", [
    ["Identify the item", "Include the exact model, preferred configuration and contact details. A manufacturer's product link can help identify what you need."],
    ["Confirm before committing", "The enquiry does not reserve stock or lock in a price. Availability, any booking amount, payment arrangements and estimated delivery need separate confirmation in writing."],
  ]),
  emi_policy: page("An installment calculator is a budgeting tool. It does not approve financing or establish an available payment method.", [
    ["Illustrative amounts", "Displayed estimates divide a price across a chosen number of months. They do not establish eligibility, interest or fees."],
    ["Ask about the full terms", "Confirm whether installments are available for the model and provider. Review the total payable, charges, deposit and payment schedule before agreeing."],
    ["Checkout choices", "Use the payment methods actually shown at checkout. A product-page estimate does not add an installment option to an order."],
  ]),
  terms_conditions: page("Read the product details and final order summary carefully when shopping with dazzle.bd.", [
    ["Products and variants", "Check the selected model, specifications, stock and any stated coverage. Images are a visual reference; ask for clarification if a detail affects your purchase."],
    ["Your account and order", "Provide accurate contact and delivery information and keep your sign-in details private. Review items, quantities and the final amount before confirming an order."],
    ["Questions and changes", "Use support to clarify a listing or request a change. Special requests, dispatch arrangements and after-sales outcomes need confirmation for the particular order."],
  ]),
  privacy_policy: page("Information you submit to dazzle.bd supports your account, orders and customer-service requests.", [
    ["Information you provide", "Registration, checkout and support forms collect details such as your name, contact information, address and message. Order records identify purchased items and their recorded status."],
    ["Account and browser storage", "Sign-in uses a session cookie. The browser can store your guest cart, wishlist and display preferences locally. Sign out on shared devices and share only the information needed for a support request."],
    ["Order services", "An enabled payment, courier or messaging service may receive information needed for the relevant order step. Ask support about your information, corrections or services used for an order."],
    ["Newsletter preferences", "Newsletter signup records the email you submit. Use the newsletter preferences page or contact support to manage your subscription."],
  ]),
  cookies_policy: page("dazzle.bd uses browser storage for practical storefront features. You can manage it through your browser settings.", [
    ["Session cookies", "A session cookie keeps you signed in between requests. Sign out on shared devices. Blocking cookies can prevent account features from working."],
    ["Saved shopping choices", "Local storage keeps guest cart items, wishlist selections and display preferences. Clearing site data can remove these choices from that browser."],
    ["Optional tracking", "If analytics or advertising services are enabled, they may use their own browser storage. Ask support which services are currently enabled and use browser controls to manage site data."],
  ]),
  data_protection_policy: page("Keep your account credentials private and share only the information needed for your dazzle.bd order or support request.", [
    ["Protecting account access", "Use a strong password and sign out on shared devices. Staff do not need your password to discuss an order. Use the account recovery flow if you cannot sign in."],
    ["Corrections and requests", "Contact support about incorrect account information or a privacy request. Include enough detail to identify the record. Personal-record requests may need confirmation of account ownership."],
  ]),
  product_disclaimer_policy: page("Identify the exact product and selected variant before buying. A category name alone does not confirm compatibility.", [
    ["Images and configuration", "A photograph may show a different colour or configuration. The selected option and confirmed order details identify the purchased item."],
    ["Suitability and changes", "Check connectors, dimensions and required features against your setup. Stock and prices can change; checkout calculates the current order amount. Ask support about discrepancies before completing payment."],
  ]),
  membership_policy: page("A dazzle.bd account gives you a place to manage your shopping and order conversations.", [
    ["Account features", "Use your account to review orders and open support requests. Keep contact details current so staff can reach you about a purchase."],
    ["Separate benefits", "Registration does not create a paid membership, guaranteed discount or points balance. Any additional programme needs clearly stated terms when it is offered."],
  ]),
  loyalty_program_policy: page("Choose according to the product and confirmed price. Do not assume an order earns rewards unless an active programme says so.", [
    ["Rewards and coupons", "Registering or browsing creates no automatic reward entitlement. Coupons apply according to their current checkout conditions. Any future loyalty programme needs its own published eligibility and redemption terms."],
  ]),
  affiliate_policy: page("Send collaboration ideas through the dazzle.bd corporate enquiry form.", [
    ["Starting a conversation", "Explain your business, audience and proposed collaboration. An enquiry does not create an affiliate account or commission agreement."],
    ["Confirmed arrangements", "Referral links, commissions and permitted brand use require a separate confirmed arrangement. Use the terms of that arrangement when communicating with your audience."],
  ]),
};
