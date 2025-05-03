import { EventEmitter } from "events";
import { Notification } from "src/schema";

class EventBus extends EventEmitter {}

const eventBus = new EventBus();
eventBus.setMaxListeners(50);

const EVENTS = {
  SIGNUP: "SIGNUP",
  NEW_ORDER: "NEW_ORDER",
  NEW_CUSTOM_ORDER: "NEW_CUSTOM_ORDER",
  NEW_REPAIR_ORDER: "NEW_REPAIR_ORDER",
  PAYMENT_CONFIRMED: "PAYMENT_CONFIRMED",
};

eventBus.on(EVENTS.SIGNUP, async (data) => {
  await Notification.create({
    title: "New User Signup",
    details: `A new user has signed up with the email: ${data.email}`,
  });
});

eventBus.on(EVENTS.NEW_ORDER, async () => {
  await Notification.create({
    title: "New Order Received",
    details: `A new order has been placed`,
  });
});

eventBus.on(EVENTS.NEW_CUSTOM_ORDER, async () => {
  await Notification.create({
    title: "New Custom Order Received",
    details: `A new custom order has been placed.`,
  });
});

eventBus.on(EVENTS.NEW_REPAIR_ORDER, async () => {
  await Notification.create({
    title: "New Repair Order Received",
    details: `A new repair order has been placed.`,
  });
});

eventBus.on(EVENTS.PAYMENT_CONFIRMED, async () => {
  await Notification.create({
    title: "Payment Confirmed",
    details: `Payment has been confirmed for an order`,
  });
});

const triggerNotification = (event: keyof typeof EVENTS, data: any) => {
  eventBus.emit(event, data);
};

export { EVENTS, triggerNotification };
