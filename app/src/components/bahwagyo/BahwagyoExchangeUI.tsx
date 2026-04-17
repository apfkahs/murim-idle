// components/bahwagyo/BahwagyoExchangeUI.tsx
// ??? 탭 환전소 UI — 상승 2개 + 하강 2개

import { EXCHANGE_RATES, RESOURCE_NAMES, RESOURCE_ICONS } from './bahwagyoData';
import type { ExchangeRate } from './bahwagyoTypes';

interface Props {
  resources: { ember: number; flame: number; divine: number };
  onExchange: (
    fromRes: 'ember' | 'flame' | 'divine',
    fromAmt: number,
    toRes: 'ember' | 'flame' | 'divine',
    toAmt: number,
  ) => void;
}

const MULTIPLIERS = [1, 5, 10] as const;

const upRates = EXCHANGE_RATES.filter(r => r.direction === 'up');
const downRates = EXCHANGE_RATES.filter(r => r.direction === 'down');

function ExchangeBlock({
  rate,
  resources,
  onExchange,
}: {
  rate: ExchangeRate;
  resources: Props['resources'];
  onExchange: Props['onExchange'];
}) {
  const have = resources[rate.fromResource];
  const maxCount = Math.floor(have / rate.fromAmount);

  function doExchange(times: number) {
    if (times <= 0) return;
    onExchange(
      rate.fromResource,
      rate.fromAmount * times,
      rate.toResource,
      rate.toAmount * times,
    );
  }

  return (
    <div className="fire-exchange-block">
      <div className="fire-exchange-title">
        {RESOURCE_ICONS[rate.fromResource]} {RESOURCE_NAMES[rate.fromResource]}
        {' → '}
        {RESOURCE_ICONS[rate.toResource]} {RESOURCE_NAMES[rate.toResource]}
      </div>
      <div className="fire-exchange-rate">
        {rate.fromAmount.toLocaleString()}개 → {rate.toAmount.toLocaleString()}개
      </div>
      <div className="fire-exchange-have">
        보유: {have.toLocaleString()}개
      </div>
      <div className="fire-exchange-btns">
        {MULTIPLIERS.map(m => (
          <button
            key={m}
            className="fire-exchange-btn"
            disabled={maxCount < m}
            onClick={() => doExchange(m)}
          >
            x{m}
          </button>
        ))}
        <button
          className="fire-exchange-btn"
          disabled={maxCount <= 0}
          onClick={() => doExchange(maxCount)}
        >
          최대
        </button>
      </div>
    </div>
  );
}

export default function BahwagyoExchangeUI({ resources, onExchange }: Props) {
  return (
    <>
      <div className="fire-exchange-section">
        <div className="fire-exchange-section-title">상승 환전</div>
        {upRates.map(rate => (
          <ExchangeBlock key={rate.id} rate={rate} resources={resources} onExchange={onExchange} />
        ))}
      </div>
      <div className="fire-exchange-section">
        <div className="fire-exchange-section-title">하강 환전</div>
        {downRates.map(rate => (
          <ExchangeBlock key={rate.id} rate={rate} resources={resources} onExchange={onExchange} />
        ))}
      </div>
    </>
  );
}
