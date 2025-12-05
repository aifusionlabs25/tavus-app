// Custom Type Definitions for Tavus
// Fixes "Property 'tavus-broadcast-view' does not exist on type 'JSX.IntrinsicElements'"

declare namespace JSX {
    interface IntrinsicElements {
        'tavus-broadcast-view': any;
    }
}
