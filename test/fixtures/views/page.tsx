// A server view whose bundled code mentions process.env, so the test can check that webpack
// does not inline the server's environment into the browser bundle.
export default function Page({ greeting }: { greeting: string }) {
  if (greeting === 'never') console.log(process.env.REF_TEST_ENV_SECRET);
  return (
    <html>
      <head>
        <title>Page</title>
      </head>
      <body>
        <p>{greeting}</p>
      </body>
    </html>
  );
}
