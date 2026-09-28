<script lang="ts">
    import Wordmark from './wordmark.svelte'
</script>

<div class="preview-box">
    <Wordmark/>
</div>

<style>
    /* Interactive stand-in for the home tab wordmark: the particle canvas is
       zoom× larger than its content and centered, so the box clips the
       overflow instead of growing with the canvas scale setting. */
    .preview-box{
        width: 100%;
        height: 220px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        overflow: hidden;
        border: var(--border-width) solid var(--background-modifier-border);
        border-radius: var(--radius-m);
        background: var(--background-primary);
        pointer-events: auto;
    }
    .preview-box :global(.home-tab-wordmark-container){
        margin-bottom: 0;
    }
    @media(max-width: 600px){
        .preview-box{
            height: 160px;
        }
    }
</style>
