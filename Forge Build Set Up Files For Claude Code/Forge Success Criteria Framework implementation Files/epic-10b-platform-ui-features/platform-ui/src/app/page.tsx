/**
 * FORGE Platform UI - Root Page
 * @epic 10a - Platform UI Core
 * @task 10a.1.1 - Initialize Next.js 14 app
 */

import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/dashboard');
}
