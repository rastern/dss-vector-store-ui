/* global $injector */
/*
 * DSS evaluates plugin js/*.js as customJSSnippets inside DataikuController.
 * The $injector reference below deliberately uses that evaluation context.
 * No DSS files, server settings, or shared vector-store definitions are changed.
 */
(function installRemoteVectorStoreUI(injector) {
    'use strict';

    const STATE_KEY = 'dkuRemoteVectorStoreUI';
    const INIT_NAME = 'dkuRemoteVectorStoreUIInit';
    const MARKER = 'ng-init="' + INIT_NAME + '(this)"';
    const TEMPLATE = '/templates/recipes/rag_embedding-recipe-creation.html';
    const LOCAL_TYPES = Object.freeze(['CHROMA', 'FAISS', 'MILVUS_LOCAL', 'QDRANT_LOCAL']);
    const previous = window[STATE_KEY];
    
    if (previous && previous.installed) return;

    const state = window[STATE_KEY] = {
        version: '0.1.0', installed: false, transformedTemplates: 0,
        initializedDialogs: 0, clearedSelections: 0, lastError: null
    };
    
    function report(message) {
        state.lastError = message;
        console.warn('[remote-vector-store-ui] ' + message);
    }
    
    if (!injector || typeof injector.get !== 'function') {
        report('DSS Angular injector is unavailable; customization was not installed.');
        return;
    }

    const root = injector.get('$rootScope');
    const cache = injector.get('$templateCache');
    const q = injector.get('$q');
    
    if (root[INIT_NAME]) {
        report('Initialization helper name is already in use; customization was not installed.');
        return;
    }

    function initializeDialog(scope) {
        if (!scope || scope.recipeType !== 'nlp_llm_rag_embedding'
                || !scope.creationSettings || typeof scope.formIsValid !== 'function'
                || typeof scope.doCreateRecipe !== 'function') {
            report('Unexpected Embed Dataset dialog scope; customization was not applied.');
            return;
        }
        
        if (scope.dkuRemoteVectorStoreUIInitialized) return;
        scope.dkuRemoteVectorStoreUIInitialized = true;

        const excluded = Object.freeze([...new Set([
            ...(Array.isArray(scope.vectorStoreExcludeTypes) ? scope.vectorStoreExcludeTypes : []),
            ...LOCAL_TYPES
        ])]);
        scope.vectorStoreExcludeTypes = excluded;
        const originalFormIsValid = scope.formIsValid;
    
        scope.formIsValid = function() {
            const type = scope.creationSettings.vectorStoreType;
    
            return !!type && !excluded.includes(type) && originalFormIsValid.apply(this, arguments);
        };

        const originalDoCreateRecipe = scope.doCreateRecipe;
        scope.doCreateRecipe = function() {
            const type = scope.creationSettings.vectorStoreType;
    
            if (!type || excluded.includes(type)) {
                return q.reject(new Error('Select a remote vector store before creating the recipe.'));
            }
    
            return originalDoCreateRecipe.apply(this, arguments);
        };

        function clearExcludedSelection() {
            if (excluded.includes(scope.creationSettings.vectorStoreType)) {
                scope.creationSettings.vectorStoreType = undefined;
                scope.creationSettings.connection = undefined;
                state.clearedSelections += 1;
            }
        }
    
        clearExcludedSelection();
    
        // The original controller receives its default through an asynchronous API call.
        // A scope-owned watcher also handles a default that arrives after initialization.
        scope.$watch('creationSettings.vectorStoreType', clearExcludedSelection);
        state.initializedDialogs += 1;
    }

    function isTarget(key) {
        return typeof key === 'string' && '/' + key.trim().replace(/^\/+/, '') === TEMPLATE;
    }

    function transform(template) {
        if (typeof template !== 'string' || template.includes(MARKER)) return template;
    
        const rootTag = template.match(/^\s*<div\b[^>]*>/);
    
        if (!rootTag || !rootTag[0].includes('id="qa_visual-recipes_creation-modal"')
                || /\bng-init\s*=/.test(rootTag[0])
                || !template.includes('exclude-types="vectorStoreExcludeTypes"')
                || !template.includes('retrievable-knowledge="creationSettings"')) {
            report('Embed Dataset template structure changed; leaving its HTML unchanged.');
    
            return template;
        }
        state.transformedTemplates += 1;
    
        return template.replace(/^(\s*<div)\b/, '$1 ' + MARKER);
    }

    const originalGet = cache.get;
    const originalPut = cache.put;
    root[INIT_NAME] = initializeDialog;
    
    cache.get = function(key) {
        const value = originalGet.apply(this, arguments);
        
        if (!isTarget(key)) return value;
        
        const result = transform(value);
        
        if (result !== value) originalPut.call(this, key, result);
        
        return result;
    };
    cache.put = function(key, value) {
        if (isTarget(key)) value = transform(value);
        return originalPut.call(this, key, value);
    };

    // Cover both already-cached templates and the eager template path. In DSS's
    // loader, the eager path returns _dkuTemplates directly after calling put().
    for (const key of [TEMPLATE, TEMPLATE.slice(1)]) {
        const value = originalGet.call(cache, key);
        if (typeof value === 'string') cache.put(key, value);
    }

    const eagerTemplates = window._dkuTemplates;
    const eagerKey = TEMPLATE.slice(1);
    
    if (eagerTemplates && typeof eagerTemplates[eagerKey] === 'string') {
        eagerTemplates[eagerKey] = transform(eagerTemplates[eagerKey]);
    }
    
    // A zero in _dkuTemplates is a lazy-load sentinel; it is intentionally retained.
    // The loader's final cache.put() returns the transformed HTML for that path.
    state.installed = true;
})(typeof $injector !== 'undefined' ? $injector : null);
