import type { ReactNode } from 'react';

const css = `
  body { font-family: system-ui, sans-serif; max-width: 640px; margin: 2rem auto; padding: 0 1rem; color: #222; }
  a { color: #2563eb; }
  ul { list-style: none; padding: 0; }
  li { display: flex; align-items: center; gap: .5rem; padding: .5rem 0; border-bottom: 1px solid #eee; }
  li .title { flex: 1; }
  .done { text-decoration: line-through; color: #888; }
  .error { color: #b91c1c; }
  form.inline { display: inline; margin: 0; }
  input[type=text] { padding: .4rem; width: 70%; }
  button { padding: .3rem .7rem; cursor: pointer; }
`;

export default function Layout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{title}</title>
        <style dangerouslySetInnerHTML={{ __html: css }} />
      </head>
      <body>
        <header>
          <a href="/tasks">Task list</a>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
