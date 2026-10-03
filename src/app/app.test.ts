import { afterEach, describe, expect, it } from 'vitest';
import { Router } from '@angular/router';
import { NativeNavigation, provideNativeRouter } from '@ng-native/router';
import { cleanup, fireEvent, render, screen, userEvent, waitFor } from '@ng-native/testing';
import { App } from './app';
import { routerFeatures, routes } from './app.routes';

async function renderApp() {
  const result = await render(App, {
    providers: [provideNativeRouter(routes, ...routerFeatures())],
  });
  return {
    router: result.componentRef.injector.get(Router),
    nav: result.componentRef.injector.get(NativeNavigation),
  };
}

afterEach(() => {
  cleanup();
});

describe('App', () => {
  it('opens on the inspections screen with an empty state', async () => {
    await renderApp();

    expect(await screen.findByText('No inspections yet')).toBeDefined();
    expect(screen.getByText('Create inspection')).toBeDefined();
  });

  it('opens the capture form and cancels back to the list', async () => {
    await renderApp();
    const user = userEvent.setup();

    await user.press(screen.getByText('Create inspection'));

    expect(await screen.findByText('New inspection')).toBeDefined();
    expect(screen.getByText('Save inspection')).toBeDefined();
    expect(screen.getByText('Cancel')).toBeDefined();

    await user.press(screen.getByText('Cancel'));

    await waitFor(() => expect(screen.queryByText('New inspection')).toBeNull());
    expect(screen.getByText('No inspections yet')).toBeDefined();
  });

  it('creates an inspection and opens it for review', async () => {
    const { nav } = await renderApp();
    const user = userEvent.setup();

    await user.press(screen.getByText('Create inspection'));
    const note = 'Cracked beam by the north stairwell';
    await user.type(
      screen.getByPlaceholderText('Where it is, what you saw, anything unusual...'),
      note
    );
    await user.press(screen.getByText('Save inspection'));

    await waitFor(() => expect(screen.queryByText('New inspection')).toBeNull());
    expect(await screen.findByText(note)).toBeDefined();

    await user.press(screen.getByText(note));

    expect(await screen.findByText(/^Ref /)).toBeDefined();

    await nav.back();

    await waitFor(() => expect(screen.queryByText(/^Ref /)).toBeNull());
    expect(screen.getByText(note)).toBeDefined();
    expect(screen.queryByText('No inspections yet')).toBeNull();
  });

  it('runs the resilience checks and reports honest results', async () => {
    const { router } = await renderApp();
    const user = userEvent.setup();

    await screen.findByText('No inspections yet');
    await router.navigate(['/tabs/diagnostics']);

    expect(await screen.findByText('Run 12 checks')).toBeDefined();
    await user.press(screen.getByText('Run 12 checks'));

    const summary = await screen.findByText(/^Done:/, undefined, { timeout: 15000 });
    expect(summary).toBeDefined();
    expect(screen.getAllByText(/- PASS/).length).toBeGreaterThanOrEqual(9);
    expect(screen.queryByText(/- FAIL/)).toBeNull();
  }, 30000);

  it('flips the offline switch as a switch, and the app follows it', async () => {
    const { router } = await renderApp();
    const strip = 'Offline — changes are saved and will sync later';

    await screen.findByText('No inspections yet');
    await router.navigate(['/tabs/diagnostics']);

    const offline = await screen.findByRole('switch', { name: 'Simulate offline' });
    expect(offline.props['value']).toBe(false);
    expect(offline.props['accessibilityRole']).toBe('switch');
    expect(screen.queryByText(strip)).toBeNull();

    await fireEvent(offline, 'change', { value: true });

    await waitFor(() =>
      expect(screen.getByRole('switch', { name: 'Simulate offline' }).props['value']).toBe(true)
    );
    expect(screen.getAllByText(strip).length).toBeGreaterThan(0);
  });
});
