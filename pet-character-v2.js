/* One lightweight, articulated storybook pet for every saved companion. */
(function (root) {
  'use strict';

  const coats = {
    bunny: '#fff9f1', 'bunny-peach': '#f7d5dc', 'bunny-cloud': '#e8edf8',
    kitten: '#f5e5d2', 'kitten-orange': '#efbf88', 'kitten-moon': '#cbd2e4',
    puppy: '#eac9a3', 'puppy-cookie': '#dbb988', 'puppy-cocoa': '#b99583'
  };
  const accents = { bunny: '#d68fa5', kitten: '#8caf9c', puppy: '#91aeca' };

  function ears(species, coat) {
    if (species === 'bunny') return `<g class="pet-ears">
      <g class="pet-ear pet-ear-left"><path d="M104 117Q65 7 98 8Q127 8 132 111Z" fill="${coat}" stroke="#a98d87" stroke-width="4"/><path d="M107 104Q82 22 99 24Q116 25 119 103Z" fill="#e8aab2" opacity=".82"/></g>
      <g class="pet-ear pet-ear-right"><path d="M188 113Q194 1 225 10Q248 20 211 121Z" fill="${coat}" stroke="#a98d87" stroke-width="4"/><path d="M201 104Q207 22 223 28Q234 35 207 110Z" fill="#e8aab2" opacity=".82"/></g>
    </g>`;
    if (species === 'kitten') return `<g class="pet-ears">
      <path class="pet-ear pet-ear-left" d="M71 124 67 38Q72 26 83 36L131 84Z" fill="${coat}" stroke="#a98d87" stroke-width="4"/>
      <path class="pet-ear pet-ear-right" d="M188 85 238 35Q249 27 252 42L248 126Z" fill="${coat}" stroke="#a98d87" stroke-width="4"/>
      <path d="m80 59 27 32-26 16m143-16 18-32-2 48" fill="#e9adb4" opacity=".8"/>
    </g>`;
    return `<g class="pet-ears">
      <path class="pet-ear pet-ear-left" d="M75 94Q30 81 38 130Q48 187 88 162L111 112Z" fill="#b68d73" stroke="#9d7b6d" stroke-width="4"/>
      <path class="pet-ear pet-ear-right" d="M245 94Q291 82 281 131Q271 182 232 159L210 111Z" fill="#b68d73" stroke="#9d7b6d" stroke-width="4"/>
    </g>`;
  }

  function render({ id, name, mood, action }) {
    const species = id.split('-')[0];
    const coat = coats[id] || coats.bunny;
    const accent = accents[species] || accents.bunny;
    const tail = species === 'bunny'
      ? `<circle class="pet-tail" cx="235" cy="273" r="24" fill="${coat}" stroke="#bba49a" stroke-width="4"/>`
      : species === 'kitten'
        ? `<path class="pet-tail" d="M228 273Q288 274 276 212Q270 184 252 199" fill="none" stroke="${coat}" stroke-width="24" stroke-linecap="round"/>`
        : `<path class="pet-tail" d="M223 266Q274 270 273 226" fill="none" stroke="${coat}" stroke-width="27" stroke-linecap="round"/>`;
    const whiskers = species === 'kitten' ? `<g class="pet-whiskers" fill="none" stroke="#9d8584" stroke-width="2.5" stroke-linecap="round">
      <path d="M74 178 34 170M76 191 34 197M246 178 286 170M244 191 286 197"/>
    </g>` : '';
    const muzzle = species === 'puppy' ? `<ellipse cx="160" cy="192" rx="46" ry="27" fill="#fff6e8" opacity=".94"/>` : `<ellipse cx="160" cy="190" rx="34" ry="21" fill="#fff7f1" opacity=".75"/>`;
    const spots = species === 'puppy' ? `<ellipse cx="90" cy="145" rx="22" ry="28" fill="#c6a081" opacity=".52"/>` : '';
    return `<div role="button" tabindex="0" onclick="COZY.pat()" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();COZY.pat()}" class="cozy-pet-art pet-character-v2 pet-action-${action} pet-species-${species} pet-mood-${mood}" aria-label="轻轻摸摸${name}">
      <svg class="cozy-pet-svg" viewBox="0 0 320 360" aria-hidden="true">
        <defs>
          <radialGradient id="pet-coat-v2" cx="32%" cy="24%" r="82%"><stop stop-color="#ffffff"/><stop offset=".54" stop-color="${coat}"/><stop offset="1" stop-color="${coat}" stop-opacity=".84"/></radialGradient>
          <linearGradient id="pet-belly-v2" x2="0" y2="1"><stop stop-color="#fffdf8"/><stop offset="1" stop-color="#f6e9df"/></linearGradient>
        </defs>
        <ellipse class="pet-ground-shadow" cx="160" cy="340" rx="92" ry="12" fill="#7f675c" opacity=".17"/>
        ${tail}
        <g class="pet-body">
          <ellipse cx="160" cy="263" rx="77" ry="70" fill="url(#pet-coat-v2)" stroke="#af978f" stroke-width="4"/>
          <ellipse cx="160" cy="276" rx="47" ry="51" fill="url(#pet-belly-v2)" opacity=".94"/>
          <g class="pet-foot pet-foot-left"><ellipse cx="107" cy="326" rx="32" ry="15" fill="${coat}" stroke="#af978f" stroke-width="3"/><ellipse cx="104" cy="330" rx="16" ry="6" fill="#e7b7b4" opacity=".5"/></g>
          <g class="pet-foot pet-foot-right"><ellipse cx="213" cy="326" rx="32" ry="15" fill="${coat}" stroke="#af978f" stroke-width="3"/><ellipse cx="216" cy="330" rx="16" ry="6" fill="#e7b7b4" opacity=".5"/></g>
          <g class="pet-arm pet-arm-left"><ellipse cx="91" cy="262" rx="20" ry="36" transform="rotate(19 91 262)" fill="${coat}" stroke="#af978f" stroke-width="3"/><ellipse cx="87" cy="283" rx="12" ry="7" fill="#e7b7b4" opacity=".55"/></g>
          <g class="pet-arm pet-arm-right"><ellipse cx="229" cy="262" rx="20" ry="36" transform="rotate(-19 229 262)" fill="${coat}" stroke="#af978f" stroke-width="3"/><ellipse cx="233" cy="283" rx="12" ry="7" fill="#e7b7b4" opacity=".55"/></g>
          <ellipse class="pet-belly-paw" cx="211" cy="280" rx="15" ry="12" fill="${coat}" stroke="#af978f" stroke-width="2"/>
        </g>
        <g class="pet-head">
          ${ears(species, coat)}
          <ellipse cx="160" cy="159" rx="101" ry="84" fill="url(#pet-coat-v2)" stroke="#af978f" stroke-width="4"/>
          ${spots}
          <ellipse cx="87" cy="184" rx="21" ry="12" fill="#edafad" opacity=".64"/>
          <ellipse cx="233" cy="184" rx="21" ry="12" fill="#edafad" opacity=".64"/>
          ${muzzle}${whiskers}
          <g class="pet-eyes"><ellipse cx="125" cy="160" rx="11" ry="15" fill="#4f4452"/><ellipse cx="195" cy="160" rx="11" ry="15" fill="#4f4452"/><circle cx="129" cy="155" r="4" fill="#fff"/><circle cx="199" cy="155" r="4" fill="#fff"/><circle cx="121" cy="166" r="1.5" fill="#fff"/><circle cx="191" cy="166" r="1.5" fill="#fff"/></g>
          <path class="pet-sleep-eyes" d="M113 160q12 12 24 0m46 0q12 12 24 0" fill="none" stroke="#66545b" stroke-width="5" stroke-linecap="round"/>
          <path d="M148 187Q160 180 172 187Q169 197 160 199Q151 197 148 187" fill="${species === 'puppy' ? '#806470' : '#c78f9a'}"/>
          <path class="pet-mouth" d="M160 199Q149 211 139 202M160 199Q171 211 181 202" fill="none" stroke="#906d78" stroke-width="3" stroke-linecap="round"/>
          <path class="pet-smile" d="M137 202Q160 226 183 202" fill="none" stroke="#a36f7d" stroke-width="4" stroke-linecap="round"/>
          <g class="pet-tears"><path d="M105 183q-9 13 0 14q9-1 0-14m110 0q-9 13 0 14q9-1 0-14" fill="#a9cfe0"/></g>
          <path class="pet-collar" d="M108 218Q160 245 212 218" fill="none" stroke="${accent}" stroke-width="11" stroke-linecap="round"/>
          <circle cx="160" cy="238" r="13" fill="#fff8ea" stroke="${accent}" stroke-width="3"/><path d="M156 235q4-7 8 0q4-7 8 0q0 6-8 12q-8-6-8-12" fill="${accent}" transform="translate(-4 -2) scale(.8)"/>
        </g>
      </svg>
      ${action !== 'idle' ? `<div class="pet-action-hearts" aria-hidden="true"><i style="--n:0">♡</i><i style="--n:1">♡</i><i style="--n:2">♡</i></div>` : ''}
    </div>`;
  }

  root.PET_CHARACTER = { render };
})(window);
