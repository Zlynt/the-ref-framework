// Fails while rendering on the server, with a secret in the error message.
export default function Broken(): never {
  throw new Error(`Database login failed: ${process.env.REF_TEST_ENV_SECRET}`);
}
