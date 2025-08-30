// Contact overlay controller
// - Intercepts mail icon clicks
// - Fades viewport to black
// - Draws 500x700px border (6px, #42de93)
// - Reveals form with sequential fade-in

(function() {
  const overlay = document.getElementById('contact-overlay');
  const box = overlay ? overlay.querySelector('.contact-box') : null;
  const rect = overlay ? overlay.querySelector('.border-rect') : null;
  const form = overlay ? overlay.querySelector('.contact-form') : null;
  const title = overlay ? overlay.querySelector('.contact-title') : null;
  const fields = overlay ? overlay.querySelectorAll('.cf-field') : [];
  const submitBtn = overlay ? overlay.querySelector('.cf-submit') : null;
  const hpField = overlay ? overlay.querySelector('#cf-hp') : null;
  const closeBtn = overlay ? overlay.querySelector('.contact-close') : null;

  if (!overlay || !box || !rect || !form || !title || !fields || !submitBtn) return;

  // Hook mail icons
  function hookMailIcons() {
    const links = Array.from(document.querySelectorAll('.far.fa-envelope')).map(icon => icon.closest('a'));
    links.forEach(link => {
      if (!link) return;
      link.addEventListener('click', (e) => {
        e.preventDefault();
        openOverlay();
      });
    });
  }

  // Open overlay with fade, draw border, then show form
  function openOverlay() {
    overlay.style.pointerEvents = 'auto';
    overlay.removeAttribute('inert');
    overlay.style.transition = 'background 0.4s ease';
    overlay.style.background = 'rgba(0,0,0,1)';

    // Border draw
    box.style.opacity = '1';
    box.classList.add('with-padding');
    const length = 2 * (394 + 594); // perimeter of the rect
    rect.style.strokeDasharray = String(length);
    rect.style.strokeDashoffset = String(length);
    // Animate dashoffset
    rect.style.transition = 'stroke-dashoffset 1.1s ease';
    requestAnimationFrame(() => {
      rect.style.strokeDashoffset = '0';
    });

    // After border draw, reveal close button and form elements sequentially
    setTimeout(() => {
      closeBtn.style.opacity = '1';
      closeBtn.style.pointerEvents = 'auto';
      form.style.transition = 'opacity 0.25s ease';
      form.style.opacity = '1';

      const sequence = [title, ...fields, submitBtn];
      let delay = 0;
      sequence.forEach(el => {
        if (!el) return;
        el.style.opacity = '0';
        el.style.transition = 'all 0.25s ease';
        setTimeout(() => {
          el.style.opacity = '1';
        }, delay);
        delay += 140;
      });
    }, 1150);

    // Dismiss overlay when clicking outside the form box after showing thank you (handled later)
  }

  function validateEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  }

  function validateFields() {
    let ok = true;
    const name = document.getElementById('cf-name');
    const email = document.getElementById('cf-email');
    const inquiry = document.getElementById('cf-inquiry');
    [name, email, inquiry].forEach(f => f.classList.remove('invalid'));
    if (!name.value.trim()) { name.classList.add('invalid'); ok = false; }
    if (!validateEmail(email.value)) { email.classList.add('invalid'); ok = false; }
    if (!inquiry.value.trim()) { inquiry.classList.add('invalid'); ok = false; }
    return ok;
  }

  function burstError() {
    overlay.classList.add('error-burst');
    box.classList.remove('shake');
    void box.offsetWidth; // reflow to restart animation
    box.classList.add('shake');
    setTimeout(() => {
      overlay.classList.remove('error-burst');
    }, 1500);
  }

  function setSubmitting(isSubmitting) {
    if (!submitBtn) return;
    submitBtn.classList.toggle('disabled', isSubmitting);
    const original = 'connect';
    const step = 25;
    if (isSubmitting) {
      if (submitBtn._decodeTimer) return; // already animating
      submitBtn._decodeTimer = setInterval(() => {
        let out = '';
        for (let i = 0; i < original.length; i++) {
          out += String.fromCharCode(33 + Math.floor(Math.random() * 90));
        }
        submitBtn.textContent = out;
      }, step);
    } else {
      if (submitBtn._decodeTimer) {
        clearInterval(submitBtn._decodeTimer);
        submitBtn._decodeTimer = null;
      }
      submitBtn.textContent = original;
    }
  }

  async function handleSubmit() {
    if (!validateFields()) { burstError(); return; }
    if (hpField && hpField.value.trim() !== '') { burstError(); return; } // honeypot
    setSubmitting(true);
    try {
      const payload = {
        name: document.getElementById('cf-name').value.trim(),
        email: document.getElementById('cf-email').value.trim(),
        inquiry: document.getElementById('cf-inquiry').value.trim(),
        token: '' // reserved for invisible reCAPTCHA if configured
      };
      const res = await fetch('contact.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(e => {
        console.error('Failed to parse response:', e);
        return { ok: false, error: 'Invalid response from server' };
      });
      
      if (!res.ok || !data.ok) {
        console.error('Form submission failed:', {
          status: res.status,
          statusText: res.statusText,
          response: data
        });
        throw new Error(data.error || 'Send failed');
      }
      
      // Log success details
      console.log('Form submitted successfully:', {
        name: payload.name,
        email: payload.email,
        inquiryLength: payload.inquiry.length,
        response: data
      });

      // Success: fade out form, show thank you, un-draw rectangle
      form.style.transition = 'opacity 0.3s ease';
      form.style.opacity = '0';
      setTimeout(() => {
        form.style.display = 'none';
        const thanks = document.createElement('div');
        thanks.className = 'contact-thanks';
        thanks.textContent = 'thank you.';
        box.appendChild(thanks);
        requestAnimationFrame(() => {
          thanks.style.opacity = '1';
        });
        // Stop button animation once thank you is visible
        setSubmitting(false);
        
        // Click anywhere to dismiss with rectangle un-draw and text decode
        overlay.addEventListener('click', () => {
          // Start un-drawing the rectangle
          const length = 2 * (394 + 594); // perimeter of the rect
          rect.style.transition = 'stroke-dashoffset 1.1s ease';
          rect.style.strokeDasharray = String(length);
          rect.style.strokeDashoffset = '0';
          requestAnimationFrame(() => {
            rect.style.strokeDashoffset = String(length);
          });

          // Decode and fade simultaneously until fully invisible
          const originalText = thanks.textContent;
          thanks.style.transition = 'opacity 0.8s ease';
          thanks.style.opacity = '0';
          
          const decodeTimer = setInterval(() => {
            if (parseFloat(getComputedStyle(thanks).opacity) <= 0.01) {
              clearInterval(decodeTimer);
              if (thanks && thanks.parentNode) thanks.parentNode.removeChild(thanks);
              return;
            }
            let out = '';
            for (let i = 0; i < originalText.length; i++) {
              out += chars[Math.floor(Math.random() * chars.length)];
            }
            thanks.textContent = out;
          }, step);
          
          // After rectangle un-draws, fade out background
          setTimeout(() => {
            overlay.style.transition = 'background 0.4s ease';
            overlay.style.background = 'rgba(0,0,0,0)';
            setTimeout(() => {
              overlay.style.pointerEvents = 'none';
              overlay.setAttribute('inert', '');
              // reset form for next open
              form.reset();
              form.style.display = '';
              form.style.opacity = '0';
              rect.style.transition = 'none';
              if (thanks && thanks.parentNode) thanks.parentNode.removeChild(thanks);
            }, 400);
          }, 1100);
        }, { once: true });
      }, 300);
    } catch (e) {
      burstError();
      setSubmitting(false);
    }
  }

  // Close form with un-draw animation
  function closeForm() {
    // First fade out close button and form
    closeBtn.style.opacity = '0';
    closeBtn.style.pointerEvents = 'none';
    
    const length = 2 * (494 + 694);
    rect.style.transition = 'stroke-dashoffset 1.1s ease';
    rect.style.strokeDasharray = String(length);
    rect.style.strokeDashoffset = '0';
    requestAnimationFrame(() => {
      rect.style.strokeDashoffset = String(length);
    });

    // Fade out form
    form.style.transition = 'opacity 0.3s ease';
    form.style.opacity = '0';

    // Fade out background after un-draw
    setTimeout(() => {
      overlay.style.transition = 'background 0.4s ease';
      overlay.style.background = 'rgba(0,0,0,0)';
      setTimeout(() => {
        overlay.style.pointerEvents = 'none';
        form.reset();
        form.style.display = '';
        rect.style.transition = 'none';
      }, 400);
    }, 1100);
  }

  function attachFormHandlers() {
    submitBtn.addEventListener('click', handleSubmit);
    closeBtn.addEventListener('click', closeForm);
    fields.forEach(f => {
      f.addEventListener('input', () => {
        if (f.classList.contains('invalid')) {
          if (f.id === 'cf-email') {
            if (validateEmail(f.value)) f.classList.remove('invalid');
          } else if (f.value.trim()) {
            f.classList.remove('invalid');
          }
        }
      });
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    hookMailIcons();
    attachFormHandlers();
    // Hover/tap decode behavior for heading text
    const itme = document.querySelector('.itme');
    if (itme) {
      const baseLetters = ['o','r','b','a','n','i','s','m','a'];
      const altLetters  = ['o','r','b','a','t','r','o','n'];
      const step = 25;
      const perLetterDuration = 300; // ms of scrambling per changed letter
      const perLetterOffset = 120;   // ms stagger between letters
      let running = false;
      let revertTimer = null;
      let activeIntervals = [];

      function toSpacedString(letters) {
        return letters.join(' ') + ' ';
      }
      function updateHeading(letters) {
        itme.textContent = toSpacedString(letters);
      }
      function indicesToChange(fromArr, toArr) {
        const maxLen = Math.max(fromArr.length, toArr.length);
        const idxs = [];
        for (let i = 0; i < maxLen; i++) {
          const a = fromArr[i] || '';
          const b = toArr[i] || '';
          if (a !== b) idxs.push(i);
        }
        return idxs;
      }
      function randomChar() {
        return String.fromCharCode(33 + Math.floor(Math.random() * 90));
      }

      function animateLetters(fromArr, toArr, onDone) {
        running = true;
        if (revertTimer) { clearTimeout(revertTimer); revertTimer = null; }
        activeIntervals.forEach(id => clearInterval(id));
        activeIntervals = [];
        const work = fromArr.slice();
        updateHeading(work);
        const idxs = indicesToChange(fromArr, toArr);
        if (idxs.length === 0) { running = false; if (onDone) onDone(); return; }
        let completed = 0;
        idxs.forEach((idx, order) => {
          const startDelay = order * perLetterOffset;
          setTimeout(() => {
            const endAt = Date.now() + perLetterDuration;
            const intervalId = setInterval(() => {
              if (Date.now() >= endAt) {
                clearInterval(intervalId);
                activeIntervals = activeIntervals.filter(id => id !== intervalId);
                work[idx] = (toArr[idx] || '');
                updateHeading(work);
                completed++;
                if (completed === idxs.length) {
                  running = false;
                  if (onDone) onDone();
                }
                return;
              }
              work[idx] = randomChar();
              updateHeading(work);
            }, step);
            activeIntervals.push(intervalId);
          }, startDelay);
        });
      }

      function triggerForward() {
        if (running) return;
        animateLetters(baseLetters, altLetters, () => {
          revertTimer = setTimeout(() => {
            if (!running) animateLetters(altLetters, baseLetters, null);
          }, 2000);
        });
      }

      updateHeading(baseLetters);
      itme.addEventListener('pointerenter', triggerForward);
      itme.addEventListener('touchstart', (e) => { e.preventDefault(); triggerForward(); }, { passive: false });
    }
  });

  document.addEventListener('DOMContentLoaded', hookMailIcons);
})();


