import React from 'react';
import Avatar from '../common/Avatar';
import HealthBar from './HealthBar';
import { formatNumber } from '../../utils/formatTime';
import './DuelStatusBar.css';

export default function DuelStatusBar({
  me,
  opponent,
}) {
  return (
    <div className="duel-status">
      <div className="duel-status__player duel-status__player--me">
        <Avatar src={me.avatar_url} name={me.username} size={48} />
        <div className="duel-status__info">
          <div className="duel-status__name-score">
            <span className="duel-status__name">{me.username} (You)</span>
            <span className="duel-status__score">{formatNumber(me.score)}</span>
          </div>
          <HealthBar health={me.health} />
          {me.combo > 1 && <span className="duel-status__combo">{me.combo} Combo</span>}
        </div>
      </div>

      <div className="duel-status__vs">VS</div>

      <div className="duel-status__player duel-status__player--opp">
        <div className="duel-status__info duel-status__info--right">
          <div className="duel-status__name-score">
            <span className="duel-status__score">{formatNumber(opponent.score)}</span>
            <span className="duel-status__name">{opponent.username}</span>
          </div>
          <HealthBar health={opponent.health} />
          {opponent.combo > 1 && <span className="duel-status__combo">{opponent.combo} Combo</span>}
        </div>
        <Avatar src={opponent.avatar_url} name={opponent.username} size={48} />
      </div>
    </div>
  );
}
