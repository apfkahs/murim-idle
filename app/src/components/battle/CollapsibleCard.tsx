import { useState, useEffect, type ReactNode } from 'react';

/**
 * 전투 UI v2 공통 접기/펼치기 카드.
 * mockup의 `.card` 구조를 네임스페이스 prefix `.combat-card` 로 이관.
 * storageKey 제공 시 localStorage에 접힘 상태를 영속 저장, 미제공 시 defaultCollapsed로 세션 로컬 동작.
 */
export interface CollapsibleCardProps {
  /** 좌측 타이틀 (굵게 표시) */
  title: ReactNode;
  /** 우측 보조 텍스트 (예: "나 vs 배화교 행자", "8.0s 진행중") */
  headerRight?: ReactNode;
  /** 카드 본문 */
  children: ReactNode;
  /** 초기 접힘 여부 (기본 false) */
  defaultCollapsed?: boolean;
  /** 헤더 자체를 없애고 본문만 보이게 (mockup의 `.card.no-head`) */
  noHead?: boolean;
  /** 추가 클래스 */
  className?: string;
  /** 본문에 적용할 추가 클래스 */
  bodyClassName?: string;
  /** localStorage 키 — 지정 시 접힘 상태를 영속 저장 */
  storageKey?: string;
}

export default function CollapsibleCard({
  title,
  headerRight,
  children,
  defaultCollapsed = false,
  noHead = false,
  className = '',
  bodyClassName = '',
  storageKey,
}: CollapsibleCardProps) {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (storageKey && typeof window !== 'undefined') {
      const v = window.localStorage?.getItem(storageKey);
      if (v === '1') return true;
      if (v === '0') return false;
    }
    return defaultCollapsed;
  });

  useEffect(() => {
    if (!storageKey || typeof window === 'undefined') return;
    window.localStorage?.setItem(storageKey, collapsed ? '1' : '0');
  }, [collapsed, storageKey]);

  if (noHead) {
    return (
      <div className={`combat-card no-head ${className}`.trim()}>
        <div className={`card-body ${bodyClassName}`.trim()}>{children}</div>
      </div>
    );
  }

  return (
    <div className={`combat-card ${collapsed ? 'collapsed' : ''} ${className}`.trim()}>
      <div
        className="card-head"
        onClick={() => setCollapsed(c => !c)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setCollapsed(c => !c);
          }
        }}
      >
        <div className="card-head-left">
          <span className="chevron">▾</span>
          <b>{title}</b>
        </div>
        {headerRight !== undefined && (
          <div className="card-head-right">{headerRight}</div>
        )}
      </div>
      <div className={`card-body ${bodyClassName}`.trim()}>{children}</div>
    </div>
  );
}
