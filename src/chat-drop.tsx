"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type ReactNode,
} from "react";
import { firstChatAttachFile } from "@/chat-attach";

type FileHandler = (file: File) => void;

const ChatDropCtx = createContext<((handler: FileHandler) => void) | null>(null);

export function useRegisterChatDrop(handler: FileHandler) {
  const register = useContext(ChatDropCtx);
  useEffect(() => {
    if (!register) return;
    register(handler);
    return () => register(() => {});
  }, [register, handler]);
}

function dragHasFiles(e: DragEvent) {
  return Array.from(e.dataTransfer.types).includes("Files");
}

export function ChatDropZone({ children, className = "" }: { children: ReactNode; className?: string }) {
  const [active, setActive] = useState(false);
  const depthRef = useRef(0);
  const handlerRef = useRef<FileHandler>(() => {});

  const register = useCallback((fn: FileHandler) => {
    handlerRef.current = fn;
  }, []);

  function onDragEnter(e: DragEvent) {
    if (!dragHasFiles(e)) return;
    e.preventDefault();
    depthRef.current += 1;
    setActive(true);
  }

  function onDragLeave(e: DragEvent) {
    if (!dragHasFiles(e)) return;
    e.preventDefault();
    depthRef.current -= 1;
    if (depthRef.current <= 0) {
      depthRef.current = 0;
      setActive(false);
    }
  }

  function onDragOver(e: DragEvent) {
    if (!dragHasFiles(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }

  function onDrop(e: DragEvent) {
    if (!dragHasFiles(e)) return;
    e.preventDefault();
    depthRef.current = 0;
    setActive(false);
    const file = firstChatAttachFile(e.dataTransfer);
    if (file) handlerRef.current(file);
  }

  return (
    <ChatDropCtx.Provider value={register}>
      <div
        className={`chat-drop-zone${active ? " chat-drop-active" : ""}${className ? ` ${className}` : ""}`}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        {children}
        {active ? (
          <div className="chat-drop-overlay" aria-hidden>
            <span className="chat-drop-label">Drop file to attach</span>
          </div>
        ) : null}
      </div>
    </ChatDropCtx.Provider>
  );
}
