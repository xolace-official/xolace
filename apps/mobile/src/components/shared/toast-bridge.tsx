import { useToast } from "heroui-native";
import { useEffect } from "react";
import { toastChannel } from "@/components/shared/toast";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";

export function ToastBridge() {
	const { toast: manager } = useToast();
	const reduced = useEffectiveReducedMotion();

	// Every render: `hide` reads the toasts of the render it came from.
	useEffect(() => {
		toastChannel.attach({ manager, reduced });
	});

	useEffect(() => () => toastChannel.detach(), []);

	return null;
}
