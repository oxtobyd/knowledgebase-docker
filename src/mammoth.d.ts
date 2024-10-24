declare module 'mammoth/mammoth.browser' {
    export function extractRawText(options: { arrayBuffer: ArrayBuffer }): Promise<{ value: string }>;
    // Add other mammoth functions you're using, if any
  }