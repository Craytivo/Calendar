import React from 'react';
import { Clock3, Star, ChevronRight } from 'lucide-react';
import { TeamMark, getDisplayTeamName } from './TeamMark.jsx';
import './GameCard.css';

function minutesUntil(startTime) {
  return Math.max(0, Math.ceil((new Date(startTime).getTime() - Date.now()) / 60000));
}

function teamLabel(team) {
  const ranking = Number.isInteger(team?.ranking) && team.ranking > 0 && team.ranking <= 25
    ? `#${team.ranking} `
    : '';
  return `${ranking}${getDisplayTeamName(team)}`;
}

function confidenceLabel(confidence) {
  if (confidence >= 0.85) return 'High confidence';
  if (confidence >= 0.65) return 'Moderate confidence';
  return 'Limited data';
}

const COMPONENT_LABELS = {
  competitive: 'Competition',
  teamQuality: 'Team quality',
  stakes: 'Stakes',
  narrative: 'Narrative',
  form: 'Form',
  personal: 'Personal',
};

function scoreValue(value) {
  return value ?? '—';
}

function ScoreCard({ game, compact, onOpen, isLive, isFinal }) {
  const { identity, league, teams, live } = game;
  const away = teams.away;
  const home = teams.home;
  const awayScore = scoreValue(live?.awayScore);
  const homeScore = scoreValue(live?.homeScore);
  const period = live?.period ?? live?.periodLabel ?? live?.level;
  const clock = live?.clock ?? live?.displayClock;
  const detail = [period, clock].filter(Boolean).join(' · ');
  const statusLabel = isLive ? 'LIVE' : 'FINAL';

  return (
    <button
      type="button"
      className={`game-card game-score-card ${isLive ? 'live-score-card' : 'final-score-card'} ${compact ? 'compact' : ''}`}
      onClick={() => onOpen?.(game)}
      aria-label={`${statusLabel}: ${getDisplayTeamName(away)} ${awayScore}, ${getDisplayTeamName(home)} ${homeScore}`}
      data-game-id={identity.gameId}
    >
      <header className="game-card-header game-score-card-header">
        <div className="game-card-context">
          <span className="game-card-league">{league.abbreviation}</span>
          <span className={`game-card-status ${isLive ? 'live-status' : ''}`}>
            {isLive && <span className="game-card-live-dot" aria-hidden="true" />}
            {statusLabel}
          </span>
          {detail && <span className="game-card-time">{detail}</span>}
        </div>
        <ChevronRight size={16} className="game-card-chevron" aria-hidden="true" />
      </header>

      <section className="game-score-only" aria-label={`${statusLabel} score`}>
        <div className="game-score-team">
          <TeamMark team={away} size={compact ? 'medium' : 'large'} />
          <span>{getDisplayTeamName(away)}</span>
          <strong>{awayScore}</strong>
        </div>
        <div className="game-score-team">
          <TeamMark team={home} size={compact ? 'medium' : 'large'} />
          <span>{getDisplayTeamName(home)}</span>
          <strong>{homeScore}</strong>
        </div>
      </section>
    </button>
  );
}

export function GameCard({ game, compact = false, onOpen }) {
  const { identity, schedule, league, teams, status, v2, explanation, live } = game;
  const isLive = status.state === 'live';
  const isFinal = status.state === 'final';
  const isScheduled = status.state === 'scheduled';

  if (isLive || isFinal) {
    return (
      <ScoreCard
        game={game}
        compact={compact}
        onOpen={onOpen}
        isLive={isLive}
        isFinal={isFinal}
      />
    );
  }

  const isStartingSoon = isScheduled
    && minutesUntil(schedule.startTime) <= 60
    && new Date(schedule.startTime).getTime() >= Date.now();
  const isFavorite = v2.components.personal.score > 0;
  const away = teams.away;
  const home = teams.home;
  const components = Object.entries(v2.components)
    .filter(([id]) => id !== 'personal' || v2.components.personal.uiContribution > 0)
    .sort(([, a], [, b]) => Number(b.contribution ?? 0) - Number(a.contribution ?? 0));
  const topComponents = components.slice(0, compact ? 2 : 6);
  const dominantComponent = explanation.dominantComponent;
  const dominantLabel = dominantComponent ? COMPONENT_LABELS[dominantComponent] : null;
  const confidence = Math.round(v2.confidence * 100);

  return (
    <button
      type="button"
      className={`game-card ${compact ? 'compact' : ''} ${isStartingSoon ? 'starting-soon' : ''}`}
      onClick={() => onOpen?.(game)}
      aria-label={`View ${getDisplayTeamName(away)} at ${getDisplayTeamName(home)}. GameScore ${v2.total}, ${v2.tier.label}.`}
      data-game-id={identity.gameId}
      data-priority-score={v2.total}
      data-confidence={v2.confidence}
    >
      <header className="game-card-header">
        <div className="game-card-context">
          <span className="game-card-league">{league.abbreviation}</span>
          {isScheduled && !isStartingSoon && <span className="game-card-time"><Clock3 size={12} aria-hidden="true" />{schedule.displayTime}</span>}
          {isStartingSoon && <span className="game-card-status starting-status">STARTS IN {minutesUntil(schedule.startTime)}M</span>}
        </div>
        <div className="game-card-actions">
          {isFavorite && <Star size={15} fill="currentColor" className="game-card-favorite" aria-label="Favorite team" />}
          <ChevronRight size={16} className="game-card-chevron" aria-hidden="true" />
        </div>
      </header>

      <section className="game-card-score-row" aria-label={`GameScore ${v2.total}, ${v2.tier.label}`}>
        <div className="game-card-score">
          <strong>{v2.total}</strong>
          <span>GAMESCORE</span>
        </div>
        <div className="game-card-tier">
          <span className="game-card-tier-label">{v2.tier.label}</span>
          {dominantLabel && <span className="game-card-dominant">Driven by {dominantLabel.toLowerCase()}</span>}
        </div>
        <div className="game-card-confidence" title={`${confidenceLabel(v2.confidence)} · ${confidence}%`}>
          <span>DATA</span>
          <strong>{confidence}%</strong>
        </div>
      </section>

      <section className="game-card-matchup">
        <div className="game-card-team">
          <TeamMark team={away} size={compact ? 'medium' : 'large'} />
          <span>{teamLabel(away)}</span>
        </div>
        <div className="game-card-at">@</div>
        <div className="game-card-team">
          <TeamMark team={home} size={compact ? 'medium' : 'large'} />
          <span>{teamLabel(home)}</span>
        </div>
      </section>

      {!compact && (
        <section className="game-card-intelligence">
          <div className="game-card-section-heading">
            <span>WHY IT RANKS HERE</span>
            {explanation.primary && <strong>{explanation.primary}</strong>}
          </div>

          {explanation.secondary && (
            <p className="game-card-summary">{explanation.secondary}</p>
          )}

          <div className="game-card-components" aria-label="GameScore V2 component contributions">
            {topComponents.map(([id, component]) => (
              <div className="game-card-component" key={id}>
                <div className="game-card-component-topline">
                  <span>{COMPONENT_LABELS[id]}</span>
                  <strong>+{Math.round(Number(component.contribution ?? 0))}</strong>
                </div>
                <div className="game-card-component-track" aria-hidden="true">
                  <span style={{ width: `${component.contributionPercent ?? 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <footer className="game-card-footer">
        <span>{schedule.displayDate}</span>
        <ChevronRight size={14} aria-hidden="true" />
      </footer>
    </button>
  );
}
