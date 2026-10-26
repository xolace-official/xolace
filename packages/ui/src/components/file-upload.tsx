"use client";

import { useDirection } from "@base-ui/react/direction-provider";
import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { useRefWithInit } from "@base-ui/utils/useRefWithInit";
import { useValueAsRef } from "@base-ui/utils/useValueAsRef";
import { cn } from "@xolace/ui/lib/utils";
import {
	FileArchiveIcon,
	FileAudioIcon,
	FileCodeIcon,
	FileCogIcon,
	FileIcon,
	FileTextIcon,
	FileVideoIcon,
} from "lucide-react";
import * as React from "react";

const ROOT_NAME = "FileUpload";
const DROPZONE_NAME = "FileUploadDropzone";
const TRIGGER_NAME = "FileUploadTrigger";
const LIST_NAME = "FileUploadList";
const ITEM_NAME = "FileUploadItem";
const ITEM_PREVIEW_NAME = "FileUploadItemPreview";
const ITEM_METADATA_NAME = "FileUploadItemMetadata";
const ITEM_PROGRESS_NAME = "FileUploadItemProgress";
const ITEM_DELETE_NAME = "FileUploadItemDelete";
const CLEAR_NAME = "FileUploadClear";

function formatBytes(bytes: number) {
	if (bytes === 0) {
		return "0 B";
	}
	const sizes = ["B", "KB", "MB", "GB", "TB"];
	const i = Math.floor(Math.log(bytes) / Math.log(1024));
	return `${(bytes / 1024 ** i).toFixed(i ? 1 : 0)} ${sizes[i]}`;
}

function getFileIcon(file: File) {
	const type = file.type;
	const extension = file.name.split(".").pop()?.toLowerCase() ?? "";

	if (type.startsWith("video/")) {
		return <FileVideoIcon />;
	}

	if (type.startsWith("audio/")) {
		return <FileAudioIcon />;
	}

	if (
		type.startsWith("text/") ||
		["txt", "md", "rtf", "pdf"].includes(extension)
	) {
		return <FileTextIcon />;
	}

	if (
		[
			"html",
			"css",
			"js",
			"jsx",
			"ts",
			"tsx",
			"json",
			"xml",
			"php",
			"py",
			"rb",
			"java",
			"c",
			"cpp",
			"cs",
		].includes(extension)
	) {
		return <FileCodeIcon />;
	}

	if (["zip", "rar", "7z", "tar", "gz", "bz2"].includes(extension)) {
		return <FileArchiveIcon />;
	}

	if (
		["exe", "msi", "app", "apk", "deb", "rpm"].includes(extension) ||
		type.startsWith("application/")
	) {
		return <FileCogIcon />;
	}

	return <FileIcon />;
}

type Direction = "ltr" | "rtl";

interface FileState {
	error?: string;
	file: File;
	progress: number;
	status: "idle" | "uploading" | "error" | "success";
}

interface StoreState {
	dragOver: boolean;
	files: Map<File, FileState>;
	invalid: boolean;
}

type StoreAction =
	| { type: "ADD_FILES"; files: File[] }
	| { type: "SET_FILES"; files: File[] }
	| { type: "SET_PROGRESS"; file: File; progress: number }
	| { type: "SET_SUCCESS"; file: File }
	| { type: "SET_ERROR"; file: File; error: string }
	| { type: "REMOVE_FILE"; file: File }
	| { type: "SET_DRAG_OVER"; dragOver: boolean }
	| { type: "SET_INVALID"; invalid: boolean }
	| { type: "CLEAR" };

type Store = {
	getState: () => StoreState;
	dispatch: (action: StoreAction) => void;
	subscribe: (listener: () => void) => () => void;
};

const StoreContext = React.createContext<Store | null>(null);

function useStoreContext(consumerName: string) {
	const context = React.useContext(StoreContext);
	if (!context) {
		throw new Error(`\`${consumerName}\` must be used within \`${ROOT_NAME}\``);
	}
	return context;
}

function useStore<T>(selector: (state: StoreState) => T): T {
	const store = useStoreContext("useStore");

	const lastValueRef = useRefWithInit<{ value: T; state: StoreState } | null>(
		() => null
	);

	const getSnapshot = React.useCallback(() => {
		const state = store.getState();
		const prevValue = lastValueRef.current;

		if (prevValue && prevValue.state === state) {
			return prevValue.value;
		}

		const nextValue = selector(state);
		lastValueRef.current = { state, value: nextValue };
		return nextValue;
	}, [store, selector, lastValueRef]);

	return React.useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot);
}

interface FileUploadContextValue {
	dir: Direction;
	disabled: boolean;
	dropzoneId: string;
	inputId: string;
	inputRef: React.RefObject<HTMLInputElement | null>;
	labelId: string;
	listId: string;
	urlCache: WeakMap<File, string>;
}

const FileUploadContext = React.createContext<FileUploadContextValue | null>(
	null
);

function useFileUploadContext(consumerName: string) {
	const context = React.useContext(FileUploadContext);
	if (!context) {
		throw new Error(`\`${consumerName}\` must be used within \`${ROOT_NAME}\``);
	}
	return context;
}

interface FileUploadProps
	extends Omit<
		React.ComponentProps<"div"> & useRender.ComponentProps<"div">,
		"defaultValue" | "onChange"
	> {
	accept?: string;
	defaultValue?: File[];
	dir?: Direction;
	disabled?: boolean;
	invalid?: boolean;
	label?: string;
	maxFiles?: number;
	maxSize?: number;
	multiple?: boolean;
	name?: string;
	onAccept?: (files: File[]) => void;
	onFileAccept?: (file: File) => void;
	onFileReject?: (file: File, message: string) => void;
	onFileValidate?: (file: File) => string | null | undefined;
	onUpload?: (
		files: File[],
		options: {
			onProgress: (file: File, progress: number) => void;
			onSuccess: (file: File) => void;
			onError: (file: File, error: Error) => void;
		}
	) => Promise<void> | void;
	onValueChange?: (files: File[]) => void;
	required?: boolean;
	value?: File[];
}

function FileUpload(props: FileUploadProps) {
	const {
		value,
		defaultValue,
		onValueChange,
		onAccept,
		onFileAccept,
		onFileReject,
		onFileValidate,
		onUpload,
		accept,
		maxFiles,
		maxSize,
		dir: dirProp,
		label,
		name,
		render,
		disabled = false,
		invalid = false,
		multiple = false,
		required = false,
		children,
		className,
		...rootProps
	} = props;

	const inputId = React.useId();
	const dropzoneId = React.useId();
	const listId = React.useId();
	const labelId = React.useId();

	const contextDir = useDirection();
	const dir = dirProp ?? contextDir;
	const listeners = useRefWithInit(() => new Set<() => void>()).current;
	const files = useRefWithInit<Map<File, FileState>>(() => new Map()).current;
	const urlCache = useRefWithInit(() => new WeakMap<File, string>()).current;
	const inputRef = React.useRef<HTMLInputElement>(null);
	const isControlled = value !== undefined;

	const propsRef = useValueAsRef({
		onAccept,
		onFileAccept,
		onFileReject,
		onFileValidate,
		onUpload,
		onValueChange,
	});

	const store = React.useMemo<Store>(() => {
		let state: StoreState = {
			dragOver: false,
			files,
			invalid,
		};

		function reducer(state: StoreState, action: StoreAction): StoreState {
			switch (action.type) {
				case "ADD_FILES": {
					for (const file of action.files) {
						files.set(file, {
							file,
							progress: 0,
							status: "idle",
						});
					}

					if (propsRef.current.onValueChange) {
						const fileList = Array.from(files.values()).map(
							(fileState) => fileState.file
						);
						propsRef.current.onValueChange(fileList);
					}
					return { ...state, files };
				}

				case "SET_FILES": {
					const newFileSet = new Set(action.files);
					for (const existingFile of files.keys()) {
						if (!newFileSet.has(existingFile)) {
							files.delete(existingFile);
						}
					}

					for (const file of action.files) {
						const existingState = files.get(file);
						if (!existingState) {
							files.set(file, {
								file,
								progress: 0,
								status: "idle",
							});
						}
					}
					return { ...state, files };
				}

				case "SET_PROGRESS": {
					const fileState = files.get(action.file);
					if (fileState) {
						files.set(action.file, {
							...fileState,
							progress: action.progress,
							status: "uploading",
						});
					}
					return { ...state, files };
				}

				case "SET_SUCCESS": {
					const fileState = files.get(action.file);
					if (fileState) {
						files.set(action.file, {
							...fileState,
							progress: 100,
							status: "success",
						});
					}
					return { ...state, files };
				}

				case "SET_ERROR": {
					const fileState = files.get(action.file);
					if (fileState) {
						files.set(action.file, {
							...fileState,
							error: action.error,
							status: "error",
						});
					}
					return { ...state, files };
				}

				case "REMOVE_FILE": {
					const cachedUrl = urlCache.get(action.file);
					if (cachedUrl) {
						URL.revokeObjectURL(cachedUrl);
						urlCache.delete(action.file);
					}

					files.delete(action.file);

					if (propsRef.current.onValueChange) {
						const fileList = Array.from(files.values()).map(
							(fileState) => fileState.file
						);
						propsRef.current.onValueChange(fileList);
					}
					return { ...state, files };
				}

				case "SET_DRAG_OVER": {
					return { ...state, dragOver: action.dragOver };
				}

				case "SET_INVALID": {
					return { ...state, invalid: action.invalid };
				}

				case "CLEAR": {
					for (const file of files.keys()) {
						const cachedUrl = urlCache.get(file);
						if (cachedUrl) {
							URL.revokeObjectURL(cachedUrl);
							urlCache.delete(file);
						}
					}

					files.clear();
					if (propsRef.current.onValueChange) {
						propsRef.current.onValueChange([]);
					}
					return { ...state, files, invalid: false };
				}

				default:
					return state;
			}
		}

		return {
			dispatch: (action) => {
				state = reducer(state, action);
				for (const listener of listeners) {
					listener();
				}
			},
			getState: () => state,
			subscribe: (listener) => {
				listeners.add(listener);
				return () => listeners.delete(listener);
			},
		};
	}, [listeners, files, invalid, propsRef, urlCache]);

	const acceptTypes = React.useMemo(
		() => accept?.split(",").map((t) => t.trim()) ?? null,
		[accept]
	);

	const onProgress = useRefWithInit(() => {
		let frame = 0;
		return (file: File, progress: number) => {
			if (frame) {
				return;
			}
			frame = requestAnimationFrame(() => {
				frame = 0;
				store.dispatch({
					file,
					progress: Math.min(Math.max(0, progress), 100),
					type: "SET_PROGRESS",
				});
			});
		};
	}).current;

	React.useEffect(() => {
		if (isControlled) {
			store.dispatch({ files: value, type: "SET_FILES" });
		} else if (
			defaultValue &&
			defaultValue.length > 0 &&
			!store.getState().files.size
		) {
			store.dispatch({ files: defaultValue, type: "SET_FILES" });
		}
	}, [value, defaultValue, isControlled, store]);

	React.useEffect(
		() => () => {
			for (const file of files.keys()) {
				const cachedUrl = urlCache.get(file);
				if (cachedUrl) {
					URL.revokeObjectURL(cachedUrl);
				}
			}
		},
		[files, urlCache]
	);

	const onFilesUpload = React.useCallback(
		async (files: File[]) => {
			try {
				for (const file of files) {
					store.dispatch({ file, progress: 0, type: "SET_PROGRESS" });
				}

				if (propsRef.current.onUpload) {
					await propsRef.current.onUpload(files, {
						onError: (file, error) => {
							store.dispatch({
								error: error.message ?? "Upload failed",
								file,
								type: "SET_ERROR",
							});
						},
						onProgress,
						onSuccess: (file) => {
							store.dispatch({ file, type: "SET_SUCCESS" });
						},
					});
				} else {
					for (const file of files) {
						store.dispatch({ file, type: "SET_SUCCESS" });
					}
				}
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : "Upload failed";
				for (const file of files) {
					store.dispatch({
						error: errorMessage,
						file,
						type: "SET_ERROR",
					});
				}
			}
		},
		[store, propsRef, onProgress]
	);

	const onFilesChange = React.useCallback(
		(originalFiles: File[]) => {
			if (disabled) {
				return;
			}

			let filesToProcess = [...originalFiles];
			let invalid = false;

			if (maxFiles) {
				const currentCount = store.getState().files.size;
				const remainingSlotCount = Math.max(0, maxFiles - currentCount);

				if (remainingSlotCount < filesToProcess.length) {
					const rejectedFiles = filesToProcess.slice(remainingSlotCount);
					invalid = true;

					filesToProcess = filesToProcess.slice(0, remainingSlotCount);

					for (const file of rejectedFiles) {
						let rejectionMessage = `Maximum ${maxFiles} files allowed`;

						if (propsRef.current.onFileValidate) {
							const validationMessage = propsRef.current.onFileValidate(file);
							if (validationMessage) {
								rejectionMessage = validationMessage;
							}
						}

						propsRef.current.onFileReject?.(file, rejectionMessage);
					}
				}
			}

			const acceptedFiles: File[] = [];
			const rejectedFiles: { file: File; message: string }[] = [];

			for (const file of filesToProcess) {
				let rejected = false;
				let rejectionMessage = "";

				if (propsRef.current.onFileValidate) {
					const validationMessage = propsRef.current.onFileValidate(file);
					if (validationMessage) {
						rejectionMessage = validationMessage;
						propsRef.current.onFileReject?.(file, rejectionMessage);
						rejected = true;
						invalid = true;
						continue;
					}
				}

				if (acceptTypes) {
					const fileType = file.type;
					const fileExtension = `.${file.name.split(".").pop()}`;

					if (
						!acceptTypes.some(
							(type) =>
								type === fileType ||
								type === fileExtension ||
								(type.includes("/*") &&
									fileType.startsWith(type.replace("/*", "/")))
						)
					) {
						rejectionMessage = "File type not accepted";
						propsRef.current.onFileReject?.(file, rejectionMessage);
						rejected = true;
						invalid = true;
					}
				}

				if (maxSize && file.size > maxSize) {
					rejectionMessage = "File too large";
					propsRef.current.onFileReject?.(file, rejectionMessage);
					rejected = true;
					invalid = true;
				}

				if (rejected) {
					rejectedFiles.push({ file, message: rejectionMessage });
				} else {
					acceptedFiles.push(file);
				}
			}

			if (invalid) {
				store.dispatch({ invalid, type: "SET_INVALID" });
				setTimeout(() => {
					store.dispatch({ invalid: false, type: "SET_INVALID" });
				}, 2000);
			}

			if (acceptedFiles.length > 0) {
				store.dispatch({ files: acceptedFiles, type: "ADD_FILES" });

				if (isControlled && propsRef.current.onValueChange) {
					const currentFiles = Array.from(store.getState().files.values()).map(
						(f) => f.file
					);
					propsRef.current.onValueChange([...currentFiles]);
				}

				if (propsRef.current.onAccept) {
					propsRef.current.onAccept(acceptedFiles);
				}

				for (const file of acceptedFiles) {
					propsRef.current.onFileAccept?.(file);
				}

				if (propsRef.current.onUpload) {
					requestAnimationFrame(() => {
						onFilesUpload(acceptedFiles);
					});
				}
			}
		},
		[
			store,
			isControlled,
			propsRef,
			onFilesUpload,
			maxFiles,
			acceptTypes,
			maxSize,
			disabled,
		]
	);

	const onInputChange = React.useCallback(
		(event: React.ChangeEvent<HTMLInputElement>) => {
			const files = Array.from(event.target.files ?? []);
			onFilesChange(files);
			event.target.value = "";
		},
		[onFilesChange]
	);

	const contextValue = React.useMemo<FileUploadContextValue>(
		() => ({
			dir,
			disabled,
			dropzoneId,
			inputId,
			inputRef,
			labelId,
			listId,
			urlCache,
		}),
		[dropzoneId, inputId, listId, labelId, dir, disabled, urlCache]
	);

	const element = useRender({
		defaultTagName: "div",
		props: mergeProps<"div">(
			{
				children: (
					<>
						{children}
						<input
							accept={accept}
							aria-describedby={dropzoneId}
							aria-labelledby={labelId}
							className="sr-only"
							disabled={disabled}
							id={inputId}
							multiple={multiple}
							name={name}
							onChange={onInputChange}
							ref={inputRef}
							required={required}
							tabIndex={-1}
							type="file"
						/>
						<div className="sr-only" id={labelId}>
							{label ?? "File upload"}
						</div>
					</>
				),
				className: cn("relative flex flex-col gap-2", className),
				dir,
			},
			rootProps
		),
		render,
		state: {
			disabled: disabled ? "" : undefined,
			slot: "file-upload",
		},
	});

	return (
		<StoreContext.Provider value={store}>
			<FileUploadContext.Provider value={contextValue}>
				{element}
			</FileUploadContext.Provider>
		</StoreContext.Provider>
	);
}

interface FileUploadDropzoneProps
	extends React.ComponentProps<"div">,
		useRender.ComponentProps<"div"> {}

function FileUploadDropzone(props: FileUploadDropzoneProps) {
	const {
		render,
		className,
		onClick: onClickProp,
		onDragOver: onDragOverProp,
		onDragEnter: onDragEnterProp,
		onDragLeave: onDragLeaveProp,
		onDrop: onDropProp,
		onPaste: onPasteProp,
		onKeyDown: onKeyDownProp,
		...dropzoneProps
	} = props;

	const context = useFileUploadContext(DROPZONE_NAME);
	const store = useStoreContext(DROPZONE_NAME);
	const dragOver = useStore((state) => state.dragOver);
	const invalid = useStore((state) => state.invalid);

	const propsRef = useValueAsRef({
		onClick: onClickProp,
		onDragEnter: onDragEnterProp,
		onDragLeave: onDragLeaveProp,
		onDragOver: onDragOverProp,
		onDrop: onDropProp,
		onKeyDown: onKeyDownProp,
		onPaste: onPasteProp,
	});

	const onClick = React.useCallback(
		(event: React.MouseEvent<HTMLDivElement>) => {
			propsRef.current.onClick?.(event);

			if (event.defaultPrevented) {
				return;
			}

			const target = event.target;

			const isFromTrigger =
				target instanceof HTMLElement &&
				target.closest('[data-slot="file-upload-trigger"]');

			if (!isFromTrigger) {
				context.inputRef.current?.click();
			}
		},
		[context.inputRef, propsRef]
	);

	const onDragOver = React.useCallback(
		(event: React.DragEvent<HTMLDivElement>) => {
			propsRef.current.onDragOver?.(event);

			if (event.defaultPrevented) {
				return;
			}

			event.preventDefault();
			store.dispatch({ dragOver: true, type: "SET_DRAG_OVER" });
		},
		[store, propsRef]
	);

	const onDragEnter = React.useCallback(
		(event: React.DragEvent<HTMLDivElement>) => {
			propsRef.current.onDragEnter?.(event);

			if (event.defaultPrevented) {
				return;
			}

			event.preventDefault();
			store.dispatch({ dragOver: true, type: "SET_DRAG_OVER" });
		},
		[store, propsRef]
	);

	const onDragLeave = React.useCallback(
		(event: React.DragEvent<HTMLDivElement>) => {
			propsRef.current.onDragLeave?.(event);

			if (event.defaultPrevented) {
				return;
			}

			const relatedTarget = event.relatedTarget;
			if (
				relatedTarget &&
				relatedTarget instanceof Node &&
				event.currentTarget.contains(relatedTarget)
			) {
				return;
			}

			event.preventDefault();
			store.dispatch({ dragOver: false, type: "SET_DRAG_OVER" });
		},
		[store, propsRef]
	);

	const onDrop = React.useCallback(
		(event: React.DragEvent<HTMLDivElement>) => {
			propsRef.current.onDrop?.(event);

			if (event.defaultPrevented) {
				return;
			}

			event.preventDefault();
			store.dispatch({ dragOver: false, type: "SET_DRAG_OVER" });

			const files = Array.from(event.dataTransfer.files);
			const inputElement = context.inputRef.current;
			if (!inputElement) {
				return;
			}

			const dataTransfer = new DataTransfer();
			for (const file of files) {
				dataTransfer.items.add(file);
			}

			inputElement.files = dataTransfer.files;
			inputElement.dispatchEvent(new Event("change", { bubbles: true }));
		},
		[store, context.inputRef, propsRef]
	);

	const onPaste = React.useCallback(
		(event: React.ClipboardEvent<HTMLDivElement>) => {
			propsRef.current.onPaste?.(event);

			if (event.defaultPrevented) {
				return;
			}

			event.preventDefault();
			store.dispatch({ dragOver: false, type: "SET_DRAG_OVER" });

			const items = event.clipboardData?.items;
			if (!items) {
				return;
			}

			const files: File[] = [];
			for (let i = 0; i < items.length; i++) {
				const item = items[i];
				if (item?.kind === "file") {
					const file = item.getAsFile();
					if (file) {
						files.push(file);
					}
				}
			}

			if (files.length === 0) {
				return;
			}

			const inputElement = context.inputRef.current;
			if (!inputElement) {
				return;
			}

			const dataTransfer = new DataTransfer();
			for (const file of files) {
				dataTransfer.items.add(file);
			}

			inputElement.files = dataTransfer.files;
			inputElement.dispatchEvent(new Event("change", { bubbles: true }));
		},
		[store, context.inputRef, propsRef]
	);

	const onKeyDown = React.useCallback(
		(event: React.KeyboardEvent<HTMLDivElement>) => {
			propsRef.current.onKeyDown?.(event);

			if (
				!event.defaultPrevented &&
				(event.key === "Enter" || event.key === " ")
			) {
				event.preventDefault();
				context.inputRef.current?.click();
			}
		},
		[context.inputRef, propsRef]
	);

	return useRender({
		defaultTagName: "div",
		props: mergeProps<"div">(
			{
				"aria-controls": `${context.inputId} ${context.listId}`,
				"aria-disabled": context.disabled,
				"aria-invalid": invalid,
				className: cn(
					"relative flex cursor-pointer select-none flex-col items-center justify-center gap-3 rounded-lg border-2 border-line-strong border-dashed bg-surface p-8 text-center text-ink-muted outline-none transition-colors hover:border-lavender hover:bg-lavender-soft/40 focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2 data-disabled:pointer-events-none data-dragging:border-lavender data-invalid:border-coral data-dragging:bg-lavender-soft data-invalid:bg-coral-soft data-disabled:opacity-50",
					className
				),
				dir: context.dir,
				id: context.dropzoneId,
				onClick,
				onDragEnter,
				onDragLeave,
				onDragOver,
				onDrop,
				onKeyDown,
				onPaste,
				role: "region",
				tabIndex: context.disabled ? undefined : 0,
			},
			dropzoneProps
		),
		render,
		state: {
			disabled: context.disabled ? "" : undefined,
			dragging: dragOver ? "" : undefined,
			invalid: invalid ? "" : undefined,
			slot: "file-upload-dropzone",
		},
	});
}

interface FileUploadTriggerProps
	extends React.ComponentProps<"button">,
		useRender.ComponentProps<"button"> {}

function FileUploadTrigger(props: FileUploadTriggerProps) {
	const { render, onClick: onClickProp, ...triggerProps } = props;

	const context = useFileUploadContext(TRIGGER_NAME);

	const propsRef = useValueAsRef({
		onClick: onClickProp,
	});

	const onClick = React.useCallback(
		(event: React.MouseEvent<HTMLButtonElement>) => {
			propsRef.current.onClick?.(event);

			if (event.defaultPrevented) {
				return;
			}

			context.inputRef.current?.click();
		},
		[context.inputRef, propsRef]
	);

	return useRender({
		defaultTagName: "button",
		props: mergeProps<"button">(
			{
				"aria-controls": context.inputId,
				disabled: context.disabled,
				onClick,
				type: "button",
			},
			triggerProps
		),
		render,
		state: {
			disabled: context.disabled ? "" : undefined,
			slot: "file-upload-trigger",
		},
	});
}

interface FileUploadListProps
	extends React.ComponentProps<"div">,
		useRender.ComponentProps<"div"> {
	forceMount?: boolean;
	orientation?: "horizontal" | "vertical";
}

function FileUploadList(props: FileUploadListProps) {
	const {
		className,
		orientation = "vertical",
		render,
		forceMount,
		...listProps
	} = props;

	const context = useFileUploadContext(LIST_NAME);
	const fileCount = useStore((state) => state.files.size);
	const shouldRender = forceMount || fileCount > 0;

	const element = useRender({
		defaultTagName: "div",
		props: mergeProps<"div">(
			{
				"aria-orientation": orientation,
				className: cn(
					"data-[state=active]:fade-in-0 data-[state=active]:slide-in-from-top-2 data-[state=inactive]:fade-out-0 data-[state=inactive]:slide-out-to-top-2 flex flex-col gap-2 data-[state=active]:animate-in data-[state=inactive]:animate-out",
					orientation === "horizontal" && "flex-row overflow-x-auto p-1.5",
					className
				),
				dir: context.dir,
				id: context.listId,
				role: "list",
			},
			listProps
		),
		render,
		state: {
			orientation,
			slot: "file-upload-list",
			state: shouldRender ? "active" : "inactive",
		},
	});

	if (!shouldRender) {
		return null;
	}

	return element;
}

interface FileUploadItemContextValue {
	fileState: FileState | undefined;
	id: string;
	messageId: string;
	nameId: string;
	sizeId: string;
	statusId: string;
}

const FileUploadItemContext =
	React.createContext<FileUploadItemContextValue | null>(null);

function useFileUploadItemContext(consumerName: string) {
	const context = React.useContext(FileUploadItemContext);
	if (!context) {
		throw new Error(`\`${consumerName}\` must be used within \`${ITEM_NAME}\``);
	}
	return context;
}

interface FileUploadItemProps
	extends React.ComponentProps<"div">,
		useRender.ComponentProps<"div"> {
	value: File;
}

function FileUploadItem(props: FileUploadItemProps) {
	const { value, render, className, ...itemProps } = props;

	const id = React.useId();
	const statusId = `${id}-status`;
	const nameId = `${id}-name`;
	const sizeId = `${id}-size`;
	const messageId = `${id}-message`;

	const context = useFileUploadContext(ITEM_NAME);
	const fileState = useStore((state) => state.files.get(value));
	const fileCount = useStore((state) => state.files.size);
	const fileIndex = useStore((state) => {
		const files = Array.from(state.files.keys());
		return files.indexOf(value) + 1;
	});

	const itemContext = React.useMemo(
		() => ({
			fileState,
			id,
			messageId,
			nameId,
			sizeId,
			statusId,
		}),
		[id, fileState, statusId, nameId, sizeId, messageId]
	);

	const statusText = fileState?.error
		? `Error: ${fileState.error}`
		: fileState?.status === "uploading"
			? `Uploading: ${fileState.progress}% complete`
			: fileState?.status === "success"
				? "Upload complete"
				: "Ready to upload";

	const element = useRender({
		defaultTagName: "div",
		props: mergeProps<"div">(
			{
				"aria-describedby": `${nameId} ${sizeId} ${statusId} ${
					fileState?.error ? messageId : ""
				}`,
				"aria-labelledby": nameId,
				"aria-posinset": fileIndex,
				"aria-setsize": fileCount,
				children: (
					<>
						{props.children}
						<span className="sr-only" id={statusId}>
							{statusText}
						</span>
					</>
				),
				className: cn(
					"relative flex items-center gap-3 rounded-md border-2 border-line bg-surface p-3",
					className
				),
				dir: context.dir,
				id,
				role: "listitem",
			},
			itemProps
		),
		render,
		state: {
			slot: "file-upload-item",
		},
	});

	if (!fileState) {
		return null;
	}

	return (
		<FileUploadItemContext.Provider value={itemContext}>
			{element}
		</FileUploadItemContext.Provider>
	);
}

interface FileUploadItemPreviewProps
	extends React.ComponentProps<"div">,
		useRender.ComponentProps<"div"> {
	previewRender?: (
		file: File,
		fallback: () => React.ReactNode
	) => React.ReactNode;
}

function FileUploadItemPreview(props: FileUploadItemPreviewProps) {
	const { previewRender, render, children, className, ...previewProps } = props;

	const itemContext = useFileUploadItemContext(ITEM_PREVIEW_NAME);
	const context = useFileUploadContext(ITEM_PREVIEW_NAME);

	const getDefaultRender = React.useCallback(
		(file: File) => {
			if (itemContext.fileState?.file.type.startsWith("image/")) {
				let url = context.urlCache.get(file);
				if (!url) {
					url = URL.createObjectURL(file);
					context.urlCache.set(file, url);
				}

				return (
					<img
						alt={file.name}
						className="size-full object-cover"
						height={40}
						src={url}
						width={40}
					/>
				);
			}

			return getFileIcon(file);
		},
		[itemContext.fileState?.file.type, context.urlCache]
	);

	const onPreviewRender = React.useCallback(
		(file: File) => {
			if (previewRender) {
				return previewRender(file, () => getDefaultRender(file));
			}

			return getDefaultRender(file);
		},
		[previewRender, getDefaultRender]
	);

	const element = useRender({
		defaultTagName: "div",
		props: mergeProps<"div">(
			{
				"aria-labelledby": itemContext.nameId,
				children: itemContext.fileState ? (
					<>
						{onPreviewRender(itemContext.fileState.file)}
						{children}
					</>
				) : null,
				className: cn(
					"relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-lavender-soft text-lavender-text [&>svg]:size-5",
					className
				),
			},
			previewProps
		),
		render,
		state: {
			slot: "file-upload-preview",
		},
	});

	if (!itemContext.fileState) {
		return null;
	}

	return element;
}

interface FileUploadItemMetadataProps
	extends React.ComponentProps<"div">,
		useRender.ComponentProps<"div"> {
	size?: "default" | "sm";
}

function FileUploadItemMetadata(props: FileUploadItemMetadataProps) {
	const {
		render,
		size = "default",
		children,
		className,
		...metadataProps
	} = props;

	const context = useFileUploadContext(ITEM_METADATA_NAME);
	const itemContext = useFileUploadItemContext(ITEM_METADATA_NAME);

	const element = useRender({
		defaultTagName: "div",
		props: mergeProps<"div">(
			{
				children: children ?? (
					<>
						<span
							className={cn(
								"truncate font-semibold text-ink text-sm",
								size === "sm" && "font-normal text-[13px] leading-snug"
							)}
							id={itemContext.nameId}
						>
							{itemContext.fileState?.file.name}
						</span>
						<span
							className={cn(
								"truncate text-ink-muted text-xs",
								size === "sm" && "text-[11px] leading-snug"
							)}
							id={itemContext.sizeId}
						>
							{itemContext.fileState
								? formatBytes(itemContext.fileState.file.size)
								: ""}
						</span>
						{itemContext.fileState?.error ? (
							<span
								className="text-coral-text text-xs"
								id={itemContext.messageId}
							>
								{itemContext.fileState.error}
							</span>
						) : null}
					</>
				),
				className: cn("flex min-w-0 flex-1 flex-col", className),
				dir: context.dir,
			},
			metadataProps
		),
		render,
		state: {
			slot: "file-upload-metadata",
		},
	});

	if (!itemContext.fileState) {
		return null;
	}

	return element;
}
interface FileUploadItemProgressProps
	extends React.ComponentProps<"div">,
		useRender.ComponentProps<"div"> {
	forceMount?: boolean;
	size?: number;
	variant?: "linear" | "circular" | "fill";
}

function FileUploadItemProgress(props: FileUploadItemProgressProps) {
	const {
		variant = "linear",
		size = 40,
		render,
		forceMount,
		className,
		...progressProps
	} = props;

	const itemContext = useFileUploadItemContext(ITEM_PROGRESS_NAME);

	const shouldRender =
		forceMount ||
		(itemContext.fileState?.progress !== 100 &&
			itemContext.fileState?.progress !== undefined);

	let elementProps: React.ComponentProps<"div"> & {
		children?: React.ReactNode;
	};

	if (variant === "circular") {
		const circumference = 2 * Math.PI * ((size - 4) / 2);
		const strokeDashoffset = itemContext.fileState
			? circumference - (itemContext.fileState.progress / 100) * circumference
			: circumference;

		elementProps = {
			"aria-labelledby": itemContext.nameId,
			"aria-valuemax": 100,
			"aria-valuemin": 0,
			"aria-valuenow": itemContext.fileState?.progress ?? 0,
			"aria-valuetext": `${itemContext.fileState?.progress ?? 0}%`,
			children: (
				<svg
					aria-hidden="true"
					className="-rotate-90 transform"
					fill="none"
					height={size}
					stroke="currentColor"
					viewBox={`0 0 ${size} ${size}`}
					width={size}
				>
					<circle
						className="text-lavender-soft"
						cx={size / 2}
						cy={size / 2}
						r={(size - 4) / 2}
						strokeWidth="2"
					/>
					<circle
						className="text-lavender transition-[stroke-dashoffset] duration-300 ease-linear"
						cx={size / 2}
						cy={size / 2}
						r={(size - 4) / 2}
						strokeDasharray={circumference}
						strokeDashoffset={strokeDashoffset}
						strokeLinecap="round"
						strokeWidth="2"
					/>
				</svg>
			),
			className: cn(
				"absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
				className
			),
			role: "progressbar",
		};
	} else if (variant === "fill") {
		const progressPercentage = itemContext.fileState?.progress ?? 0;
		const topInset = 100 - progressPercentage;

		elementProps = {
			"aria-labelledby": itemContext.nameId,
			"aria-valuemax": 100,
			"aria-valuemin": 0,
			"aria-valuenow": progressPercentage,
			"aria-valuetext": `${progressPercentage}%`,
			className: cn(
				"absolute inset-0 bg-lavender/50 transition-[clip-path] duration-300 ease-linear",
				className
			),
			role: "progressbar",
			style: {
				clipPath: `inset(${topInset}% 0% 0% 0%)`,
			},
		};
	} else {
		elementProps = {
			"aria-labelledby": itemContext.nameId,
			"aria-valuemax": 100,
			"aria-valuemin": 0,
			"aria-valuenow": itemContext.fileState?.progress ?? 0,
			"aria-valuetext": `${itemContext.fileState?.progress ?? 0}%`,
			children: (
				<div
					className="h-full w-full flex-1 bg-lavender transition-transform duration-300 ease-linear"
					style={{
						transform: `translateX(-${100 - (itemContext.fileState?.progress ?? 0)}%)`,
					}}
				/>
			),
			className: cn(
				"relative h-2 w-full overflow-hidden rounded-full bg-surface-sunken",
				className
			),
			role: "progressbar",
		};
	}

	const element = useRender({
		defaultTagName: "div",
		props: mergeProps<"div">(elementProps, progressProps),
		render,
		state: {
			slot: "file-upload-progress",
			variant,
		},
	});

	if (!(itemContext.fileState && shouldRender)) {
		return null;
	}

	return element;
}

interface FileUploadItemDeleteProps
	extends React.ComponentProps<"button">,
		useRender.ComponentProps<"button"> {}

function FileUploadItemDelete(props: FileUploadItemDeleteProps) {
	const { render, onClick: onClickProp, ...deleteProps } = props;

	const store = useStoreContext(ITEM_DELETE_NAME);
	const itemContext = useFileUploadItemContext(ITEM_DELETE_NAME);

	const onClick = React.useCallback(
		(event: React.MouseEvent<HTMLButtonElement>) => {
			onClickProp?.(event);

			if (!itemContext.fileState || event.defaultPrevented) {
				return;
			}

			store.dispatch({
				file: itemContext.fileState.file,
				type: "REMOVE_FILE",
			});
		},
		[store, itemContext.fileState, onClickProp]
	);

	const element = useRender({
		defaultTagName: "button",
		props: mergeProps<"button">(
			{
				"aria-controls": itemContext.id,
				"aria-describedby": itemContext.nameId,
				onClick,
				type: "button",
			},
			deleteProps
		),
		render,
		state: {
			slot: "file-upload-item-delete",
		},
	});

	if (!itemContext.fileState) {
		return null;
	}

	return element;
}

interface FileUploadClearProps
	extends React.ComponentProps<"button">,
		useRender.ComponentProps<"button"> {
	forceMount?: boolean;
}

function FileUploadClear(props: FileUploadClearProps) {
	const {
		render,
		forceMount,
		disabled,
		onClick: onClickProp,
		...clearProps
	} = props;

	const context = useFileUploadContext(CLEAR_NAME);
	const store = useStoreContext(CLEAR_NAME);
	const fileCount = useStore((state) => state.files.size);

	const isDisabled = disabled || context.disabled;

	const onClick = React.useCallback(
		(event: React.MouseEvent<HTMLButtonElement>) => {
			onClickProp?.(event);

			if (event.defaultPrevented) {
				return;
			}

			store.dispatch({ type: "CLEAR" });
		},
		[store, onClickProp]
	);

	const shouldRender = forceMount || fileCount > 0;

	const element = useRender({
		defaultTagName: "button",
		props: mergeProps<"button">(
			{
				"aria-controls": context.listId,
				disabled: isDisabled,
				onClick,
				type: "button",
			},
			clearProps
		),
		render,
		state: {
			disabled: isDisabled ? "" : undefined,
			slot: "file-upload-clear",
		},
	});

	if (!shouldRender) {
		return null;
	}

	return element;
}

export {
	FileUpload,
	FileUploadClear,
	FileUploadDropzone,
	FileUploadItem,
	FileUploadItemDelete,
	FileUploadItemMetadata,
	FileUploadItemPreview,
	FileUploadItemProgress,
	FileUploadList,
	type FileUploadProps,
	FileUploadTrigger,
	useStore as useFileUpload,
};
