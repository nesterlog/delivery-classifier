import React, { ReactNode } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

interface LayoutProps {
  children: ReactNode;
  title?: string;
}

const Layout = ({ children, title = '허우적 배송분류 자동화 시스템' }: LayoutProps) => {
  const router = useRouter();
  
  const isActive = (path: string) => {
    return router.pathname === path ? 'active' : '';
  };

  return (
    <div>
      <Head>
        <title>{title}</title>
        <meta charSet="utf-8" />
        <meta name="viewport" content="initial-scale=1.0, width=device-width" />
      </Head>
      
      <header>
        <div className="container">
          <div className="card mb-0">
            <div className="card-body">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <img 
                    src="/logo.png" 
                    alt="로고" 
                    className="header-logo"
                  />
                  <div className="ml-3">
                    <h1 className="text-2xl font-bold text-primary mb-0">배송분류 자동화 시스템</h1>
                    <span className="badge badge-light text-sm">v2.0</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <nav className="nav">
          <div className="container">
            <div className="flex">
              <Link href="/classify" legacyBehavior>
                <a className={`nav-link ${isActive('/classify')}`}>
                  <span className="nav-full-text">배송 분류</span>
                  <span className="nav-short-text">배송분류</span>
                </a>
              </Link>
              <Link href="/dawn-option" legacyBehavior>
                <a className={`nav-link ${isActive('/dawn-option')}`}>
                  <span className="nav-full-text">새벽 옵션 추가</span>
                  <span className="nav-short-text">새벽옵션</span>
                </a>
              </Link>
              <Link href="/invoice" legacyBehavior>
                <a className={`nav-link ${isActive('/invoice')}`}>
                  <span className="nav-full-text">송장 매칭</span>
                  <span className="nav-short-text">송장매칭</span>
                </a>
              </Link>
              <Link href="/zipcode" legacyBehavior>
                <a className={`nav-link ${isActive('/zipcode')}`}>
                  <span className="nav-full-text">우편번호 관리</span>
                  <span className="nav-short-text">우편번호</span>
                </a>
              </Link>
              <Link href="/api-key" legacyBehavior>
                <a className={`nav-link ${isActive('/api-key')}`}>
                  <span className="nav-full-text">API 키 관리</span>
                  <span className="nav-short-text">API키</span>
                </a>
              </Link>
              <Link href="/data-management" legacyBehavior>
                <a className={`nav-link ${isActive('/data-management')}`}>
                  <span className="nav-full-text">데이터 관리</span>
                  <span className="nav-short-text">데이터</span>
                </a>
              </Link>
            </div>
          </div>
        </nav>
      </header>
      
      <main className="container mt-4">
        {children}
      </main>
      
      <footer className="mt-5 pt-3 pb-3 text-center text-gray">
        <div className="container">
          <p>© 2023-2025 허우적 배송분류 자동화 시스템. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Layout; 