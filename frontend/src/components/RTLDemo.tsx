import React from 'react';
import { RTLText } from './RTLText';

/**
 * Demo component to showcase RTL language support
 * This can be used for testing and demonstration purposes
 */
export function RTLDemo() {
  const examples = [
    {
      language: 'English',
      text: 'Hello, this is a test message in English.',
    },
    {
      language: 'Persian/Farsi',
      text: 'سلام، این یک پیام آزمایشی به زبان فارسی است.',
    },
    {
      language: 'Arabic',
      text: 'مرحبا، هذه رسالة اختبار باللغة العربية.',
    },
    {
      language: 'Hebrew',
      text: 'שלום, זהו הודעת בדיקה בעברית.',
    },
    {
      language: 'Mixed (English + Persian)',
      text: 'This is English text mixed with فارسی text in the same sentence.',
    },
    {
      language: 'Mixed (Arabic + English)',
      text: 'هذا نص عربي مختلط مع English text في نفس الجملة.',
    },
  ];

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-2xl font-bold mb-6">RTL Language Support Demo</h2>
      
      {examples.map((example, index) => (
        <div key={index} className="border rounded-lg p-4 bg-gray-50">
          <h3 className="font-semibold text-sm text-gray-600 mb-2">
            {example.language}
          </h3>
          <RTLText className="text-base leading-relaxed">
            {example.text}
          </RTLText>
        </div>
      ))}
      
      <div className="border rounded-lg p-4 bg-blue-50">
        <h3 className="font-semibold text-sm text-blue-600 mb-2">
          Markdown with RTL Support
        </h3>
        <RTLText className="text-base leading-relaxed">
          <div>
            <p>**Bold text in Persian:** **این متن پررنگ است**</p>
            <p>*Italic text in Arabic:* *هذا نص مائل*</p>
            <ul>
              <li>Persian list item: آیتم فهرست فارسی</li>
              <li>Arabic list item: عنصر قائمة عربية</li>
              <li>English list item</li>
            </ul>
            <blockquote>
              This is a blockquote with mixed content: این یک نقل قول است
            </blockquote>
          </div>
        </RTLText>
      </div>
    </div>
  );
} 