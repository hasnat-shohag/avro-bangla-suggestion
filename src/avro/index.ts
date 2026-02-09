import { wrap, type Remote } from "comlink";
import type { TAvroPhonetic } from "./types";

export * from "./types";

/**
 * Initializes the Avro worker.
 *
 * @returns A promise that resolves to the Comlink-wrapped worker API.
 */
export const initAvroWorker = (): Remote<TAvroPhonetic> => {
	const worker = new Worker(
		new URL("./static/avro.worker.js", import.meta.url),
		{ type: "module" },
	);
	const avroWorker = wrap<TAvroPhonetic>(worker);
	return avroWorker;
};

// Default singleton instance handler if needed, but manual init is preferred for portability
let globalWorkerInstance: Remote<TAvroPhonetic> | null = null;

export const getGlobalAvroWorker = () => {
	if (!globalWorkerInstance) {
		globalWorkerInstance = initAvroWorker();
	}
	return globalWorkerInstance;
};
