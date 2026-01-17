// Root index route - redirects based on auth state
export { loader } from '~/loaders/index.server';

export default function Index() {
  // loader에서 항상 리다이렉트하므로 렌더링되지 않음
  return null;
}
