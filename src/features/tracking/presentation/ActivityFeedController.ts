import { Injectable } from '@magic-runtime/di';
import { makeObservable, observable, observableRef, runInAction } from 'mobx';
import { DomainError } from '@/shared/domain/DomainError';
import {
  GetActivity,
  ListActivities,
  ListPendingActivities,
} from '../application/ActivityHistory';
import { mergeNewestFirst, type Activity } from '../domain/Activity';

export type ActivityFeedStatus = 'idle' | 'loading' | 'loadingMore' | 'failed';

@Injectable([ListActivities, ListPendingActivities, GetActivity])
export class ActivityFeedController {
  status: ActivityFeedStatus = 'idle';
  items: readonly Activity[] = [];
  errorCode: string | undefined = undefined;
  opened: Activity | undefined = undefined;
  private nextCursor: string | undefined;
  private refreshing: Promise<void> | undefined;

  constructor(
    private readonly listActivities: ListActivities,
    private readonly listPending: ListPendingActivities,
    private readonly getActivity: GetActivity,
  ) {
    makeObservable(this, {
      status: observable,
      items: observableRef,
      errorCode: observable,
      opened: observableRef,
    });
  }

  get hasMore(): boolean {
    return this.nextCursor !== undefined;
  }

  refresh(): Promise<void> {
    this.refreshing ??= this.loadFirst().finally(() => {
      this.refreshing = undefined;
    });
    return this.refreshing;
  }

  async loadMore(): Promise<void> {
    const cursor = this.nextCursor;
    if (cursor === undefined || this.status !== 'idle') return;
    runInAction(() => {
      this.status = 'loadingMore';
    });
    try {
      const page = await this.listActivities.execute(cursor);
      runInAction(() => {
        this.items = mergeNewestFirst(this.items, page.items);
        this.nextCursor = page.nextCursor;
        this.status = 'idle';
      });
    } catch (error) {
      this.fail(error);
    }
  }

  find(id: string): Activity | undefined {
    return (
      this.items.find(a => a.id === id) ??
      (this.opened?.id === id ? this.opened : undefined)
    );
  }

  async open(id: string): Promise<void> {
    if (this.find(id)) return;
    try {
      const activity = await this.getActivity.execute(id);
      runInAction(() => {
        this.opened = activity;
      });
    } catch (error) {
      this.fail(error);
    }
  }

  private async loadFirst(): Promise<void> {
    runInAction(() => {
      if (this.items.length === 0) this.items = this.listPending.execute();
      this.status = 'loading';
      this.errorCode = undefined;
    });
    try {
      const page = await this.listActivities.execute();
      runInAction(() => {
        this.items = page.items;
        this.nextCursor = page.nextCursor;
        this.status = 'idle';
      });
    } catch (error) {
      runInAction(() => {
        this.items = mergeNewestFirst(this.items, this.listPending.execute());
      });
      this.fail(error);
    }
  }

  private fail(error: unknown): void {
    runInAction(() => {
      this.status = 'failed';
      this.errorCode =
        error instanceof DomainError ? error.code : 'ACTIVITY_SERVER';
    });
  }
}
