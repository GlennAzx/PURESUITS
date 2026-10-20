import React, { useState, useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

export default function ContactPage() {
  const [status, setStatus] = useState('');
  const pageRef = useRef(null);
  const formRef = useRef(null);

  useGSAP(
    () => {
      // Page entrance timeline — stagger header then form
      const tl = gsap.timeline({
        defaults: {
          duration: 0.6,
          ease: 'cubic-bezier(0.23, 1, 0.32, 1)',
        },
      });

      tl.from('.contact-header', {
        opacity: 0,
        y: 30,
      }).from(
        formRef.current,
        {
          opacity: 0,
          y: 40,
          scale: 0.97,
        },
        '-=0.35'
      );
    },
    { scope: pageRef }
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('Submitting...');

    // Flash feedback on button
    const btn = e.target.querySelector('button[type="submit"]');
    gsap.fromTo(
      btn,
      { scale: 0.97 },
      { scale: 1, duration: 0.2, ease: 'cubic-bezier(0.23, 1, 0.32, 1)' }
    );

    // Replace with your Formspree ID: https://formspree.io/f/YOUR_ID
    const res = await fetch('https://formspree.io/f/YOUR_ID', {
      method: 'POST',
      body: new FormData(e.target),
      headers: { Accept: 'application/json' },
    });
    if (res.ok) {
      setStatus('Dispatched! We will contact you via Discord.');
      e.target.reset();
    } else {
      setStatus(
        'Error submitting. Please contact an officer directly on Discord.'
      );
    }
  };

  const inputClass =
    'w-full bg-ink-black border border-gray-700 rounded p-2.5 text-sm text-ivory outline-none transition-[border-color] duration-200 ease-out-strong focus:border-imperial-gold';

  return (
    <div ref={pageRef} className="max-w-xl mx-auto px-4 lg:pr-24 py-24">
      <div className="contact-header text-center mb-8">
        <h2 className="text-3xl font-serif font-bold text-ivory mb-2">
          Guild Enlistment
        </h2>
        <p className="text-sm text-gray-400">
          Submit your credentials to join PURESUIT
        </p>
      </div>

      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="bg-ink-charcoal border border-imperial-gold/30 rounded-xl p-6 space-y-4 shadow-xl"
      >
        <div>
          <label className="block text-xs font-semibold text-gray-300 uppercase mb-1">
            Character Name
          </label>
          <input required name="characterName" className={inputClass} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-300 uppercase mb-1">
            Discord Tag
          </label>
          <input
            required
            name="discordTag"
            placeholder="e.g. wanderer#1234"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-300 uppercase mb-1">
            Primary Martial Discipline
          </label>
          <input
            required
            name="discipline"
            placeholder="e.g. Nameless Blades / Broadsword"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-300 uppercase mb-1">
            Brief Introduction
          </label>
          <textarea rows="3" name="message" className={inputClass} />
        </div>
        <button
          type="submit"
          className="btn-press w-full py-2.5 rounded bg-imperial-gold text-ink-black font-serif font-bold text-sm hover:bg-imperial-gold-bright transition-[background-color,transform] duration-200 ease-out-strong shadow-lg cursor-pointer"
        >
          Dispatch Application Scroll
        </button>
        {status && (
          <p className="text-xs text-center text-imperial-gold mt-2">
            {status}
          </p>
        )}
      </form>
    </div>
  );
}
