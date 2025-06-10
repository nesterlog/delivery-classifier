import '../styles/globals.css';
import type { AppProps } from 'next/app';
import Layout from '../components/Layout';
import { AuthProvider } from '../components/AuthContext';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();

  useEffect(() => {
    // 라우팅 오류 핸들링
    const handleRouteError = (err: Error) => {
      console.error('라우팅 오류:', err);
      if (err.message.includes('abort')) {
        console.log('라우팅이 중단되었습니다. 새로 고침 중...');
        router.reload();
      }
    };

    router.events.on('routeChangeError', handleRouteError);

    return () => {
      router.events.off('routeChangeError', handleRouteError);
    };
  }, [router]);

  return (
    <AuthProvider>
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </AuthProvider>
  );
}

export default MyApp; 