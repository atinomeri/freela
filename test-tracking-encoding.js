// Простой скрипт для тестирования кодирования/декодирования параметров трекинга

// Тестовые данные
const testEmail = 'user@example.com';
const testUrl = 'https://example.com/some-page';

// Кодируем в Base64
const encodedEmail = Buffer.from(testEmail).toString('base64');
const encodedUrl = Buffer.from(testUrl).toString('base64');

console.log('=== Email Tracking (Pixel) ===');
console.log('Original Email:', testEmail);
console.log('Encoded Email:', encodedEmail);
console.log('Pixel URL:', `http://localhost:3000/api/tracking/pixel?data=${encodedEmail}`);
console.log('');

console.log('=== Click Tracking ===');
console.log('Original Email:', testEmail);
console.log('Original URL:', testUrl);
console.log('Encoded Email:', encodedEmail);
console.log('Encoded URL:', encodedUrl);
console.log('Click Tracking URL:', `http://localhost:3000/api/tracking/click?url=${encodedUrl}&email=${encodedEmail}`);
console.log('');

// Проверяем декодирование
console.log('=== Decoding Test ===');
console.log('Decoded Email:', Buffer.from(encodedEmail, 'base64').toString('utf-8'));
console.log('Decoded URL:', Buffer.from(encodedUrl, 'base64').toString('utf-8'));
console.log('');

// Пример HTML для вставки в письмо
console.log('=== HTML Examples for Email ===');
console.log('<!-- Tracking Pixel (невидимый) -->');
console.log(`<img src="http://localhost:3000/api/tracking/pixel?data=${encodedEmail}" width="1" height="1" style="display:none;" alt="" />`);
console.log('');
console.log('<!-- Tracked Link -->');
console.log(`<a href="http://localhost:3000/api/tracking/click?url=${encodedUrl}&email=${encodedEmail}">Click here</a>`);
