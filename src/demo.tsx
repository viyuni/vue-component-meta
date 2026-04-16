import { defineVaporComponent } from "vue";

export default defineVaporComponent(({ name }: { name: string }) => {
  return () => <div>{name} is working</div>;
});
