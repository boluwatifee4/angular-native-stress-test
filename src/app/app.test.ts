import { describe, expect, it } from 'vitest';
import { render, screen, userEvent } from '@ng-native/testing';
import { App } from './app';

describe('App component integration test', () => {
  it('renders root header and navigation tabs', async () => {
    await render(App);

    expect(screen.getByText('📋 SiteLog')).toBeDefined();
    expect(screen.getByText('Reports')).toBeDefined();
    expect(screen.getByText('Queue')).toBeDefined();
    expect(screen.getByText('Chaos Lab')).toBeDefined();
    expect(screen.getByText('Capture')).toBeDefined();
  });
});
