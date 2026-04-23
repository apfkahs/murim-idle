/**
 * 희미한 성화 개봉 연출 모달
 * 3×3 슬롯-커서 연출로 뽑기 결과를 공개한다.
 */
import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { SEONGHWA_DROP_TABLE } from '../data/materials';
import { getSeonghwaDropImage } from '../assets';

type Phase = 'idle' | 'spinning' | 'checking' | 'done';
type Rarity = 'common' | 'rare' | 'rare150' | 'epic' | 'legend';

const TILE_RARITY: Record<number, Rarity> = {
  0: 'common', 1: 'common', 2: 'common',
  3: 'rare', 4: 'rare',
  5: 'rare150',
  6: 'epic',
  7: 'legend', 8: 'legend',
};

const FAKE_CHANCE = 0.5;
const SETTLE_DUR = { legend: 1000, epic: 880, rare150: 820, default: 760 } as const;
const CHECK_INTERVAL_SMALL = 130;
const CHECK_INTERVAL_BIG = 450;
const CYCLE = [0, 1, 2, 5, 8, 7, 6, 3, 4];

const sleep = (ms: number) => new Promise<void>(res => setTimeout(res, ms));

function pickFake(target: number): number {
  const tier = TILE_RARITY[target];
  let cands: number[];
  if (tier === 'legend')       cands = [0, 1, 2];
  else if (tier === 'epic')    cands = [7, 8];
  else if (tier === 'rare150') cands = [6, 7, 8];
  else                          cands = [5, 6, 7, 8];
  cands = cands.filter(c => c !== target);
  if (cands.length === 0) return target;
  return cands[Math.floor(Math.random() * cands.length)];
}

function getSettleDur(target: number): number {
  const tier = TILE_RARITY[target];
  if (tier === 'legend') return SETTLE_DUR.legend;
  if (tier === 'epic') return SETTLE_DUR.epic;
  if (tier === 'rare150') return SETTLE_DUR.rare150;
  return SETTLE_DUR.default;
}

function getTileName(idx: number): string {
  const entry = SEONGHWA_DROP_TABLE[idx];
  if (entry.equipId) {
    if (entry.equipId === 'sarajinun_bulggot_boots') return '불꽃 장화';
    return '불꽃 무기';
  }
  return `잔불 ×${entry.materialCount}`;
}

export default function SeonghwaRevealModal() {
  const pendingReveal = useGameStore(s => s.pendingReveal);
  const dismissPendingReveal = useGameStore(s => s.dismissPendingReveal);

  const [phase, setPhase] = useState<Phase>('idle');
  const [active, setActive] = useState<number | null>(null);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [counts, setCounts] = useState<Record<number, number>>({});
  const [legendHit, setLegendHit] = useState<Set<number>>(new Set());
  const tileRefs = useRef<(HTMLDivElement | null)[]>([]);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Esc 키 차단 (연출 중에만)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && phase !== 'done') e.preventDefault();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [phase]);

  // 메인 애니메이션 시퀀스
  useEffect(() => {
    if (!pendingReveal) return;

    let cancelled = false;

    // 상태 초기화
    setPhase('idle');
    setActive(null);
    setChecked(new Set());
    setCounts({});
    setLegendHit(new Set());

    // ── 이펙트 헬퍼들 (컴포넌트 스코프 DOM 조작) ──
    const setActiveTile = (idx: number | null) => {
      if (cancelled) return;
      setActive(idx);
    };
    const addSettling = (idx: number, dur: number) => {
      const el = tileRefs.current[idx];
      if (!el) return;
      el.style.setProperty('--settle-dur', `${dur}ms`);
      el.classList.add('settling');
    };
    const removeSettling = (idx: number) => {
      tileRefs.current[idx]?.classList.remove('settling');
    };
    const checkTile = (idx: number) => {
      if (cancelled) return;
      setChecked(prev => {
        const next = new Set(prev);
        next.add(idx);
        return next;
      });
      if (TILE_RARITY[idx] === 'legend') {
        setLegendHit(prev => {
          const next = new Set(prev);
          next.add(idx);
          return next;
        });
      }
      setCounts(prev => ({ ...prev, [idx]: (prev[idx] ?? 0) + 1 }));
    };

    const spawnParticles = (el: HTMLElement, count: number, tier: string) => {
      for (let i = 0; i < count; i++) {
        const p = document.createElement('div');
        p.className = 'sm-particle';
        const angle = (i / count) * 360;
        const dist = 40 + Math.random() * 30;
        const color = tier === 'legend' ? '#ffd700' : tier === 'epic' ? '#ffa500' : tier === 'rare150' ? '#a78bfa' : '#fff';
        p.style.cssText = `
          position: absolute; width: 6px; height: 6px;
          border-radius: 50%;
          background: ${color};
          left: 50%; top: 50%; pointer-events: none; z-index: 100;
          animation: smParticle 0.8s ease-out forwards;
          --dx: ${Math.cos(angle * Math.PI / 180) * dist}px;
          --dy: ${Math.sin(angle * Math.PI / 180) * dist}px;
        `;
        el.appendChild(p);
        setTimeout(() => p.remove(), 900);
      }
    };

    const spawnBanner = (title: string, sub: string) => {
      const b = document.createElement('div');
      b.className = 'sm-banner';
      const t = document.createElement('span');
      t.className = 'sm-banner-title';
      t.textContent = title;
      const s = document.createElement('span');
      s.className = 'sm-banner-sub';
      s.textContent = sub;
      b.appendChild(t);
      b.appendChild(s);
      wrapRef.current?.appendChild(b);
      setTimeout(() => b.remove(), 2500);
    };

    const addFloat = (idx: number, text: string) => {
      const el = tileRefs.current[idx];
      if (!el) return;
      const f = document.createElement('div');
      f.className = 'sm-float';
      f.textContent = text;
      el.appendChild(f);
      setTimeout(() => f.remove(), 1200);
    };

    const triggerDim = () => {
      const d = document.createElement('div');
      d.className = 'sm-dim-overlay';
      wrapRef.current?.appendChild(d);
      setTimeout(() => d.remove(), 1000);
    };

    const triggerFlash = () => {
      const f = document.createElement('div');
      f.className = 'sm-flash-overlay';
      wrapRef.current?.appendChild(f);
      setTimeout(() => f.remove(), 200);
    };

    const triggerShake = () => {
      wrapRef.current?.classList.add('sm-shaking');
      setTimeout(() => wrapRef.current?.classList.remove('sm-shaking'), 450);
    };

    const triggerWrapGlow = () => {
      wrapRef.current?.classList.add('sm-wrap-glow');
      setTimeout(() => wrapRef.current?.classList.remove('sm-wrap-glow'), 1200);
    };

    const spawnShock = (el: HTMLElement) => {
      const s = document.createElement('div');
      s.className = 'sm-shock';
      el.appendChild(s);
      setTimeout(() => s.remove(), 700);
    };

    const spawnPillar = (el: HTMLElement) => {
      const p = document.createElement('div');
      p.className = 'sm-pillar';
      el.appendChild(p);
      setTimeout(() => p.remove(), 900);
    };

    const spawnRays = (el: HTMLElement) => {
      for (let i = 0; i < 8; i++) {
        const r = document.createElement('div');
        r.className = 'sm-ray';
        r.style.setProperty('--ray-rot', `${i * 45}deg`);
        r.style.transform = `rotate(${i * 45}deg)`;
        el.appendChild(r);
        setTimeout(() => r.remove(), 900);
      }
    };

    // ── 티어별 리빌 ──
    const legendReveal = async (idx: number) => {
      const el = tileRefs.current[idx];
      if (!el) return;
      triggerDim();
      await sleep(200);
      spawnShock(el);
      spawnPillar(el);
      await sleep(140);
      triggerFlash();
      triggerShake();
      triggerWrapGlow();
      spawnRays(el);
      spawnParticles(el, 20, 'legend');
      spawnBanner('전 설 획 득', getTileName(idx));
      addFloat(idx, '전설!');
      el.classList.add('landed', 'landed-big');
      await sleep(1700);
      el.classList.remove('landed', 'landed-big');
    };

    const epicReveal = async (idx: number) => {
      const el = tileRefs.current[idx];
      if (!el) return;
      triggerFlash();
      spawnParticles(el, 10, 'epic');
      spawnBanner('희귀 획득', getTileName(idx));
      el.classList.add('landed', 'landed-big');
      await sleep(600);
      el.classList.remove('landed', 'landed-big');
    };

    const rare150Reveal = async (idx: number) => {
      const el = tileRefs.current[idx];
      if (!el) return;
      spawnParticles(el, 6, 'rare150');
      addFloat(idx, '+150');
      el.classList.add('landed');
      await sleep(350);
      el.classList.remove('landed');
    };

    const normalReveal = async (idx: number, big: boolean) => {
      const el = tileRefs.current[idx];
      if (!el) return;
      if (big) {
        addFloat(idx, `+${SEONGHWA_DROP_TABLE[idx].materialCount ?? ''}`);
        el.classList.add('landed');
        await sleep(450);
        el.classList.remove('landed');
      } else {
        el.classList.add('landed');
        await sleep(130);
        el.classList.remove('landed');
      }
    };

    const doReveal = async (idx: number, isLast: boolean): Promise<number> => {
      const tier = TILE_RARITY[idx];
      if (tier === 'legend')  { await legendReveal(idx);  return 1050; }
      if (tier === 'epic')    { await epicReveal(idx);    return 600; }
      if (tier === 'rare150') { await rare150Reveal(idx); return 350; }
      if (isLast) { await normalReveal(idx, true); return CHECK_INTERVAL_BIG; }
      await normalReveal(idx, false);
      return CHECK_INTERVAL_SMALL;
    };

    // ── 고속 구간 (감속 없음, 일정 속도로 등가회전) ──
    const spinConstant = async (durationMs: number, stepMs: number, startOffset: number) => {
      const hops = Math.round(durationMs / stepMs);
      for (let i = 0; i < hops; i++) {
        if (cancelled) return startOffset + hops;
        setActiveTile(CYCLE[(startOffset + i) % CYCLE.length]);
        await sleep(stepMs);
      }
      return startOffset + hops;
    };

    // ── 자유 스핀 + 페이크아웃 ──
    const spinFree = async (hops: number, startOffset: number) => {
      for (let i = 0; i < hops; i++) {
        if (cancelled) return;
        const t = hops <= 1 ? 1 : i / (hops - 1);
        // 감속 커브: 초반 빠름 → 후반 급감속
        const delay = 50 + (1050 - 50) * Math.pow(t, 3.2);
        setActiveTile(CYCLE[(startOffset + i) % CYCLE.length]);
        await sleep(delay);
      }
    };

    const spinEndingTense = async (target: number) => {
      const doFake = Math.random() < FAKE_CHANCE;
      const settleDur = getSettleDur(target);

      if (doFake) {
        const fake = pickFake(target);
        setActiveTile(fake);
        addSettling(fake, settleDur);
        await sleep(settleDur);
        removeSettling(fake);
        setActiveTile(target);
        await sleep(60);
      } else {
        setActiveTile(target);
        addSettling(target, settleDur);
        await sleep(settleDur);
        removeSettling(target);
        await sleep(40);
      }
    };

    const run = async () => {
      setPhase('spinning');
      // 1단계: 3초간 고속 일정 회전 (감속 없음, 60ms/hop)
      const offset = await spinConstant(3000, 60, 0) ?? 0;
      if (cancelled) return;
      // 2단계: 감속 스핀 (~7.5초)
      await spinFree(26, offset);
      if (cancelled) return;
      await spinEndingTense(pendingReveal.rolls[0].dropIndex);
      if (cancelled) return;

      setPhase('checking');

      if (pendingReveal.rolls.length === 1) {
        const target = pendingReveal.rolls[0].dropIndex;
        setActiveTile(target);
        await sleep(85);
        checkTile(target);
        await doReveal(target, true);
      } else {
        for (let i = 0; i < pendingReveal.rolls.length; i++) {
          if (cancelled) return;
          const target = pendingReveal.rolls[i].dropIndex;
          setActiveTile(target);
          await sleep(85);
          checkTile(target);
          const isLast = i === pendingReveal.rolls.length - 1;
          await doReveal(target, isLast);
        }
      }

      if (cancelled) return;
      setActiveTile(null);
      setPhase('done');
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [pendingReveal]);

  if (!pendingReveal) return null;

  return (
    <div
      className="popup-overlay"
      onClick={phase === 'done' ? dismissPendingReveal : undefined}
    >
      <div
        className="popup-content seonghwa-modal"
        ref={wrapRef}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-title" style={{ textAlign: 'center' }}>희미한 성화 개봉</div>

        <div className="sm-grid">
          {Array.from({ length: 9 }, (_, idx) => {
            const rarity = TILE_RARITY[idx];
            const isActive = active === idx;
            const isChecked = checked.has(idx);
            const isLegendHit = legendHit.has(idx);
            const count = counts[idx];

            const classes = [
              'sm-tile',
              `sm-tile-${rarity}`,
              isActive ? 'active' : '',
              isChecked ? 'checked' : '',
              isLegendHit ? 'legend-hit' : '',
            ].filter(Boolean).join(' ');

            const img = getSeonghwaDropImage(SEONGHWA_DROP_TABLE[idx]);

            return (
              <div
                key={idx}
                className={classes}
                ref={el => { tileRefs.current[idx] = el; }}
              >
                {img ? (
                  <img src={img} alt={getTileName(idx)} className="sm-tile-img" />
                ) : (
                  <span className="sm-tile-name">{getTileName(idx)}</span>
                )}
                <span className="sm-tile-label" data-label={getTileName(idx)}>{getTileName(idx)}</span>
                {count != null && count >= 2 && (
                  <span key={count} className="sm-mark-badge">×{count}</span>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <button
            className="btn"
            disabled={phase !== 'done'}
            onClick={dismissPendingReveal}
            style={{ minWidth: 120 }}
          >
            {phase !== 'done' ? '성화가 타오르는 중...' : '닫기'}
          </button>
        </div>
      </div>
    </div>
  );
}
