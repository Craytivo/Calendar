import React from 'react';
import { Clock3, Star, ChevronRight, Activity } from 'lucide-react';
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

export function GameCard({ game, compact = false, onOpen }) {
  const { identity, schedule, league, teams, status, v2, explanation, live } = game;
  const isLive = status.state === 'live';
  const isFinal = status.state === 'final';
  const isScheduled = status.state === 'scheduled';
  const isStartingSoon = isScheduled
    && minutesUntil(schedule.startTime) <= 60
    && new Date(schedule.startTime).getTime() >= Date.now();
  const isFavorite = v2.components.personal.score > 0;
  const away = teams.away;
  const home = teams.home;
  const hasLiveScore = (isLive || isFinal)
    && (live?.awayScore != null || live?.homeScore != null);
  const awayScore = scoreValue(live?.awayScore);
  const homeScore = scoreValue(live?.homeScore);
  const period = live?.period ?? live?.periodLabel ?? live?.level;
  const clock = live?.clock ?? live?.displayClock;
  const liveDetail = [period, clock].filter(Boolean).join(' · ');
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
      className={`game-card ${compact ? 'compact' : ''} ${isLive ? 'live' : ''} ${isFinal ? 'final' : ''} ${isStartingSoon ? 'starting-soon' : ''}`}
      onClick={() => onOpen?.(game)}
      aria-label={isLive || isFinal
        ? `${isLive ? 'Live' : 'Final'} score: ${getDisplayTeamName(away)} ${awayScore}, ${getDisplayTeamName(home)} ${homeScore}`
        : `View ${getDisplayTeamName(away)} at ${getDisplayTeamName(home)}. GameScore ${v2.total}, ${v2.tier.label}.`}
      data-game-id={identity.gameId}
      data-priority-score={v2.total}
      data-confidence={v2.confidence}
    >
      <header className="game-card-header">
        <div className="game-card-context">
          <span className="game-card-league">{league.abbreviation}</span>
          {isLive && <span className="game-card-status live-status"><span className="game-card-live-dot" aria-hidden="true" />LIVE</span>}
          {isFinal && <span className="game-card-status">FINAL</span>}
          {isScheduled && !isStartingSoon && <span className="game-card-time"><Clock3 size={12} aria-hidden="true" />{schedule.displayTime}</span>}
          {isStartingSoon && <span className="game-card-status starting-status">STARTS IN {minutesUntil(schedule.startTime)}M</span>}
          {(isLive || isFinal) && liveDetail && <span className="game-card-time">{liveDetail}</span>}
        </div>
        <div className="game-card-actions">
          {isFavorite && <Star size={15} fill="currentColor" className="game-card-favorite" aria-label="Favorite team" />}
          <ChevronRight size={16} className="game-card-chevron" aria-hidden="true" />
        </div>
      </header>

      <section className={`game-card-score-row ${isLive || isFinal ? 'game-card-live-score-row' : ''}`} aria-label={isLive || isFinal ? `${isLive ? 'Live' : 'Final'} score` : `GameScore ${v2.total}, ${v2.tier.label}`}>
        {isLive || isFinal ? (
          <>
            <div className="game-card-score live-score-value">
              <strong>{awayScore}</strong>
              <span>{getDisplayTeamName(away)}</span>
            </div>
            <div className="game-card-tier live-score-divider">
              {isLive && <span className="game-card-live-label"><Activity size={12} aria-hidden="true" /> LIVE SCORE</span>}
              {isFinal && <span className="game-card-live-label">FINAL SCORE</span>}
            </div>
            <div className="game-card-score live-score-value live-score-home">
              <strong>{homeScore}</strong>
              <span>{getDisplayTeamName(home)}</span>
            </div>
          </>
        ) : (
          <>
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
          </>
        )}
      </section>

      <section className={`game-card-matchup ${hasLiveScore ? 'has-score' : ''}`}>
        <div className={`game-card-team ${isFinal && awayScoreWins(live?.awayScore, live?.homeScore) ? 'winner' : ''}`}>
          <TeamMark team={away} size={compact ? 'medium' : 'large'} />
          <span>{teamLabel(away)}</span>
          {hasLiveScore && <strong>{awayScore}</strong>}
        </div>
        <div className="game-card-at">@</div>
        <div className={`game-card-team ${isFinal && homeScoreWins(live?.awayScore, live?.homeScore) ? 'winner' : ''}`}>
          <TeamMark team={home} size={compact ? 'medium' : 'large'} />
          <span>{teamLabel(home)}</span>
          {hasLiveScore && <strong>{homeScore}</strong>}
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
        <span>{isLive ? 'Live score' : isFinal ? 'Final score' : schedule.displayDate}</span>
        {isLive && live?.level && <span>Live {live.level.toLowerCase()}</span>}
        <ChevronRight size={14} aria-hidden="true" />
      </footer>
    </button>
  );
}

function awayScoreWins(awayScore, homeScore) {
  return awayScore != null && homeScore != null && awayScore > homeScore;
}

function homeScoreWins(awayScore, homeScore) {
  return awayScore != null && homeScore != null && homeScore > awayScore;
}
