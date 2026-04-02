<script>
  import { onMount } from "svelte";

  let message = $state("Cargando...");

  onMount(async () => {
    try {
      const res = await fetch("http://localhost:3000");
      const data = await res.json();
      message = data.message;
    } catch (error) {
      console.error(error);
      message = "Error conectando al backend";
    }
  });
</script>

<h1>{message}</h1>