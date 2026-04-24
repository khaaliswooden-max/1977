// Companion page entry. Story 5.2 establishes the page shell + nav;
// stories 5.3 / 5.4 / 5.5 / 5.6 fill in the live demos and the
// long-form prose for each section. Story 5.13 adds the language
// toggle.

import { lang, type Lang } from '@/companion/i18n';
import { mountCompanionContent } from '@/companion/companion';
import { log } from '@/util/log';

log.info('companion boot');

const content = document.getElementById('content');
if (!content) throw new Error('invariant: #content element missing');

wireLangSwitch();
mountCompanionContent(content);

function wireLangSwitch(): void {
  const buttons = document.querySelectorAll<HTMLButtonElement>(
    '.lang-switch button',
  );
  for (const btn of Array.from(buttons)) {
    btn.addEventListener('click', () => {
      const next = btn.dataset['lang'] as Lang | undefined;
      if (next === 'en' || next === 'zh') lang.set(next);
    });
  }
}
