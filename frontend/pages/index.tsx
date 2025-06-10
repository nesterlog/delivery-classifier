import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // 기본 페이지를 classify 페이지로 리다이렉트
    const redirectTimer = setTimeout(() => {
      router.push('/classify').catch(error => {
        console.error('라우팅 오류 발생:', error);
        // 문제 발생 시 페이지 새로고침
        window.location.href = '/classify';
      });
    }, 500); // 약간의 지연 추가
    
    return () => clearTimeout(redirectTimer);
  }, [router]);

  return (
    <>
      <Head>
        <title>허우적 배송분류 자동화 시스템 - 메인</title>
        <meta name="description" content="허우적 배송분류 자동화 시스템 메인 페이지. 당일배송, 새벽배송, 택배배송을 효율적으로 분류하는 자동화 솔루션입니다." />
        <meta property="og:title" content="허우적 배송분류 자동화 시스템 - 메인" />
        <meta property="og:description" content="허우적 배송분류 자동화 시스템 메인 페이지. 당일배송, 새벽배송, 택배배송을 효율적으로 분류하는 자동화 솔루션입니다." />
        <link rel="canonical" href="https://delivery.example.com/" />
      </Head>
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h1>배송 분류 자동화 시스템</h1>
        <p>로딩 중...</p>
      </div>
    </>
  );
} 