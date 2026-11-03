import Layout from './components/Layout';

export default function NotFound({ path }: { path: string }) {
  return (
    <Layout title="Not found">
      <h1>Page not found</h1>
      <p>Nothing lives at {path}.</p>
      <a href="/tasks">Go to the task list</a>
    </Layout>
  );
}
