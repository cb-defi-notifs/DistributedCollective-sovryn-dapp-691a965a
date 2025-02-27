import {
  BehaviorSubject,
  Observable,
  distinctUntilKeyChanged,
  map,
  filter,
  startWith,
} from 'rxjs';

export type EventDriverState = {
  fastBtcDialog: FastBtcDialogState;
};

export type FastBtcDialogState = {
  isOpen: boolean;
  shouldHideSend: boolean;
};

const INITIAL_STATE = {
  fastBtcDialog: {
    isOpen: false,
    shouldHideSend: false,
  },
};

const store = new BehaviorSubject<EventDriverState>(INITIAL_STATE);

type State = (previousState: EventDriverState) => EventDriverState;

const dispatch = (state: State) => store.next(state(store.getValue()));

// Selectors
function select(): Observable<EventDriverState>;
function select<T extends keyof EventDriverState>(
  stateKey: T,
): Observable<EventDriverState[T]>;
function select<T extends keyof EventDriverState>(
  stateKey?: keyof EventDriverState,
): Observable<EventDriverState[T]> | Observable<EventDriverState> {
  if (!stateKey) return store.asObservable();

  const validStateKeys = Object.keys(store.getValue());

  if (!validStateKeys.includes(String(stateKey))) {
    throw new Error(`key: ${stateKey} does not exist on this store`);
  }

  return store.asObservable().pipe(
    startWith(store.getValue()),
    distinctUntilKeyChanged(stateKey),
    map(x => x?.[stateKey]),
    filter(value => value !== null && value !== undefined),
  ) as Observable<EventDriverState[T]>;
}

const get = (): EventDriverState => store.getValue();

// Actions
const openFastBtcDialog = (shouldHideSend: boolean = false) =>
  dispatch(state => ({
    ...state,
    fastBtcDialog: {
      isOpen: true,
      shouldHideSend,
    },
  }));

const closeFastBtcDialog = () =>
  dispatch(state => ({
    ...state,
    fastBtcDialog: {
      ...state.fastBtcDialog,
      isOpen: false,
    },
  }));

export const sharedState = {
  get,
  select,
  actions: {
    openFastBtcDialog,
    closeFastBtcDialog,
  },
};
