import type { Mode } from './api'
import { Icon } from './icons'
import { VULNERABILITIES, type VulnId } from './vulnerabilities'

// The hero: the app (a shield) wired to the five attacks.
// Dots travel from each attack toward the shield.
//   Secure mode:     every attack stops at the shield's edge.
//   Vulnerable mode: the attacks get through and the shield turns coral.
// Coordinates are in a 1000 x 400 box; the tiles are placed on top in percentages.

type Point = [number, number]

interface Route {
  id: VulnId
  tile: Point // centre of the attack tile
  path: Point[] // from the tile edge to the shield edge
}

const CENTER: Point = [500, 215]

const ROUTES: Route[] = [
  { id: 'sql', tile: [300, 95], path: [[345, 95], [385, 95], [425, 180]] },
  { id: 'access', tile: [110, 215], path: [[155, 215], [425, 215]] },
  { id: 'xss', tile: [310, 330], path: [[355, 330], [390, 330], [425, 255]] },
  { id: 'passwords', tile: [700, 95], path: [[655, 95], [615, 95], [575, 180]] },
  { id: 'misconfig', tile: [890, 215], path: [[845, 215], [575, 215]] },
]

const toD = (points: Point[]) => points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x} ${y}`).join(' ')
const pct = ([x, y]: Point) => ({ left: `${x / 10}%`, top: `${y / 4}%` })

export function AttackMap({ mode, compact = false }: { mode: Mode; compact?: boolean }) {
  const breached = mode === 'vulnerable'

  return (
    <div
      className={`attack-map${compact ? ' compact' : ''}${breached ? ' breached' : ''}`}
      role="img"
      aria-label={
        breached
          ? 'Vulnerable mode: five attacks reach the app.'
          : 'Secure mode: five attacks are blocked at the app.'
      }
    >
      <svg viewBox="0 0 1000 400" className="wires" aria-hidden="true">
        {ROUTES.map(route => (
          <path key={route.id} d={toD([...route.path, CENTER])} className="wire" />
        ))}
        {ROUTES.flatMap(route => route.path.slice(1, -1)).map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="4" className="joint" />
        ))}

        {/* Remount the animated dots whenever the mode changes so they restart together. */}
        <g key={mode} className="packets">
          {ROUTES.map((route, i) => {
            const end = route.path[route.path.length - 1]
            const d = toD(breached ? [...route.path, CENTER] : route.path)
            const begin = `${i * 0.42}s`
            return (
              <g key={route.id}>
                <circle r="5" opacity="0" className="packet">
                  <animateMotion dur="2.6s" begin={begin} repeatCount="indefinite" path={d} />
                  <animate attributeName="opacity" dur="2.6s" begin={begin} repeatCount="indefinite"
                    values="0;1;1;0" keyTimes="0;0.12;0.86;1" />
                </circle>
                {!breached && (
                  <circle cx={end[0]} cy={end[1]} r="6" opacity="0" className="blocked">
                    <animate attributeName="r" dur="2.6s" begin={begin} repeatCount="indefinite"
                      values="6;6;16;16" keyTimes="0;0.84;0.98;1" />
                    <animate attributeName="opacity" dur="2.6s" begin={begin} repeatCount="indefinite"
                      values="0;0;0.9;0" keyTimes="0;0.84;0.86;1" />
                  </circle>
                )}
              </g>
            )
          })}
        </g>
      </svg>

      {ROUTES.map(route => {
        const v = VULNERABILITIES.find(x => x.id === route.id)!
        return (
          <div key={route.id} className="map-node" style={pct(route.tile)}>
            <span className={`tile tile-${route.id}`}><Icon name={v.icon} /></span>
            <span className="map-label">{v.title}</span>
          </div>
        )
      })}

      <div className="map-node map-center" style={pct(CENTER)}>
        <span key={mode} className={`core${breached ? ' core-breached' : ''}`}>
          <Icon name={breached ? 'shieldAlert' : 'shieldCheck'} strokeWidth={1.8} />
        </span>
      </div>
    </div>
  )
}
