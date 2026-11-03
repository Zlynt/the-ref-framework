export const render = 'client';

export default function Client({ greeting }: { greeting: string }) {
  if (greeting === 'never') console.log(process.env.REF_TEST_ENV_SECRET);
  return (
    <html>
      <head>
        <title>Client</title>
      </head>
      <body>
        <p>{greeting}</p>
      </body>
    </html>
  );
}
