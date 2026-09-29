export type AwardProcessingWatch = {
  registrationId: string;
  registrationNumber: number;
  entryIds: string[];
};

export type AwardNotice = {
  type:
    | "success"
    | "error"
    | "info";

  message: string;
};

const WATCH_KEY =
  "dna:award-processing";

const NOTICE_KEY =
  "dna:award-notice";

export const AWARD_PROCESSING_EVENT =
  "dna:award-processing-changed";

export const AWARD_NOTICE_EVENT =
  "dna:award-notice";

export function watchAwardProcessing(
  watch: AwardProcessingWatch,
) {
  localStorage.setItem(
    WATCH_KEY,
    JSON.stringify(
      watch,
    ),
  );

  window.dispatchEvent(
    new Event(
      AWARD_PROCESSING_EVENT,
    ),
  );
}

export function readAwardProcessingWatch():
  AwardProcessingWatch | null {
  try {
    const raw =
      localStorage.getItem(
        WATCH_KEY,
      );

    return raw
      ? JSON.parse(raw)
      : null;
  } catch {
    return null;
  }
}

export function clearAwardProcessingWatch() {
  localStorage.removeItem(
    WATCH_KEY,
  );
}

export function publishAwardNotice(
  notice: AwardNotice,
) {
  sessionStorage.setItem(
    NOTICE_KEY,
    JSON.stringify(
      notice,
    ),
  );

  window.dispatchEvent(
    new Event(
      AWARD_NOTICE_EVENT,
    ),
  );
}

export function consumeAwardNotice():
  AwardNotice | null {
  try {
    const raw =
      sessionStorage.getItem(
        NOTICE_KEY,
      );

    if (!raw) {
      return null;
    }

    sessionStorage.removeItem(
      NOTICE_KEY,
    );

    return JSON.parse(
      raw,
    );
  } catch {
    return null;
  }
}