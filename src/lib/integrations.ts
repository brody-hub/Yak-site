export type IntegrationProviderId = "revenuecat"

/**
 * Things a provider unlocks. Dashboard widgets and KPI sections declare the
 * capability they need, so a widget is offered only once something can answer
 * it. Keep the ids in step with the server's provider catalogue.
 */
export type IntegrationCapability =
  | "subscription-metrics"
  | "revenue-metrics"

export type IntegrationStep = {
  title: string
  body: string
}

export type IntegrationProvider = {
  id: IntegrationProviderId
  label: string
  blurb: string
  /** What the panel can show once the provider is connected. */
  unlocks: string[]
  keyPlaceholder: string
  keyLabel: string
  docsUrl: string
  /** Walkthrough rendered on the integrations page. */
  steps: IntegrationStep[]
}

export const INTEGRATION_PROVIDERS: IntegrationProvider[] = [
  {
    id: "revenuecat",
    label: "RevenueCat",
    blurb:
      "Reads subscription and revenue metrics for your app so KPI and money widgets show real numbers.",
    unlocks: [
      "MRR, ARR, and trailing revenue",
      "Active subscriptions and trials",
      "New customers and active users",
      "Revenue and subscription trend charts",
    ],
    keyLabel: "Secret API key (v2)",
    keyPlaceholder: "sk_…",
    docsUrl: "https://www.revenuecat.com/docs/projects/authentication",
    steps: [
      {
        title: "Open your RevenueCat project settings",
        body: "Sign in at app.revenuecat.com, pick the project that backs this app, then go to Project settings → API keys.",
      },
      {
        title: "Create a new V2 secret key",
        body: "Choose “New secret key”, name it something you will recognise later such as “Stand panel”, and keep it a V2 key. V1 keys cannot read metrics.",
      },
      {
        title: "Turn on every Read permission",
        body: "In the V2 key form, enable Read on every permission group — Charts & Metrics, Project Configuration, Customer Information, and the rest. A key with only one or two read scopes is rejected. Leave every Write permission off; Stand never modifies anything in RevenueCat.",
      },
      {
        title: "Copy the key once and paste it below",
        body: "RevenueCat shows the secret a single time. Paste it straight into the field below rather than saving it to a note or a shared document, then close the RevenueCat tab.",
      },
      {
        title: "Confirm the connection",
        body: "Stand verifies the key against RevenueCat before storing it and resolves which project it can read. If the key is wrong or under-permissioned you will see the error immediately.",
      },
    ],
  },
]

export function getIntegrationProvider(id: IntegrationProviderId) {
  return INTEGRATION_PROVIDERS.find((provider) => provider.id === id)
}

export function getIntegrationLabel(id: IntegrationProviderId) {
  return getIntegrationProvider(id)?.label ?? id
}
