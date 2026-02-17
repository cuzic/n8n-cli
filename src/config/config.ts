/** Config holds the CLI configuration. */
export interface Config {
  apiURL: string;
  apiKey: string;
  timeoutMs: number;
  output: "json" | "table";
}

/** ConfigError represents a configuration error. */
export class ConfigError extends Error {
  constructor(
    public readonly field: string,
    message: string,
    public readonly hint: string,
  ) {
    super(message);
    this.name = "ConfigError";
  }
}

/** Returns the default configuration. */
export function defaultConfig(): Config {
  return {
    apiURL: "",
    apiKey: "",
    timeoutMs: 30_000,
    output: "json",
  };
}

/**
 * Loads configuration from environment variables.
 * Reads N8N_API_URL, N8N_API_KEY, N8N_API_TIMEOUT from process.env.
 * Does NOT read .env files — direnv handles that in this project.
 */
export function loadFromEnv(config: Config): Config {
  const url = process.env.N8N_API_URL;
  if (url) {
    config.apiURL = url;
  }

  const key = process.env.N8N_API_KEY;
  if (key) {
    config.apiKey = key;
  }

  const timeout = process.env.N8N_API_TIMEOUT;
  if (timeout) {
    const ms = Number.parseInt(timeout, 10);
    if (!Number.isNaN(ms) && ms > 0) {
      config.timeoutMs = ms;
    }
  }

  return config;
}

/** Validates the configuration. Throws ConfigError if invalid. */
export function validate(config: Config): void {
  if (!config.apiURL) {
    throw new ConfigError(
      "api-url",
      "API URL is required",
      "Set N8N_API_URL environment variable or use --api-url flag",
    );
  }
  if (!config.apiKey) {
    throw new ConfigError(
      "api-key",
      "API key is required",
      "Set N8N_API_KEY environment variable or use --api-key flag",
    );
  }
}
