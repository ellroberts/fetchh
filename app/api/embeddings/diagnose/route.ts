// app/api/embeddings/diagnose/route.ts
// Diagnostic endpoint to check RAG system setup

import { createClient } from '../../../../lib/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - please sign in' },
        { status: 401 }
      );
    }

    const diagnostics: Record<string, any> = {
      user_id: user.id,
      checks: {},
    };

    // Check 1: Can we access the conversation_embeddings table?
    console.log('🔍 Check 1: Testing table access...');
    const { count: embeddingCount, error: tableError } = await supabase
      .from('conversation_embeddings')
      .select('*', { count: 'exact', head: true });

    diagnostics.checks.table_access = {
      success: !tableError,
      total_embeddings: embeddingCount || 0,
      error: tableError?.message || null,
    };

    // Check 2: Do any embeddings have actual vector data?
    console.log('🔍 Check 2: Checking for vector data...');
    const { data: sampleData, error: sampleError } = await supabase
      .from('conversation_embeddings')
      .select('id, embedding, chunk_index')
      .limit(1);

    if (sampleError) {
      diagnostics.checks.vector_data = {
        success: false,
        error: sampleError.message,
      };
    } else if (sampleData && sampleData.length > 0) {
      const sample = sampleData[0];
      const hasEmbedding = sample.embedding !== null;
      const embeddingInfo = hasEmbedding
        ? {
            type: typeof sample.embedding,
            is_array: Array.isArray(sample.embedding),
            length: Array.isArray(sample.embedding)
              ? sample.embedding.length
              : typeof sample.embedding === 'string'
                ? sample.embedding.length
                : 0,
          }
        : null;

      diagnostics.checks.vector_data = {
        success: hasEmbedding,
        sample_id: sample.id,
        embedding_info: embeddingInfo,
      };
    } else {
      diagnostics.checks.vector_data = {
        success: false,
        error: 'No embeddings found in database',
      };
    }

    // Check 3: Test if the RPC function exists
    console.log('🔍 Check 3: Testing RPC function...');
    // Create a simple test embedding (just zeros)
    const testEmbedding = new Array(1536).fill(0);
    const embeddingString = `[${testEmbedding.join(',')}]`;

    const { data: rpcData, error: rpcError } = await supabase.rpc(
      'match_conversation_chunks',
      {
        query_embedding: embeddingString,
        conversation_ids: [],
        match_threshold: 0.0,
        match_count: 1,
      }
    );

    if (rpcError) {
      diagnostics.checks.rpc_function = {
        success: false,
        error: rpcError.message,
        code: rpcError.code,
        hint: rpcError.hint,
        fix:
          'The RPC function may not exist. Run the migration: psql -f supabase/migrations/004_add_rag_embeddings.sql',
      };
    } else {
      diagnostics.checks.rpc_function = {
        success: true,
        message: 'RPC function exists and responds',
        returned_rows: rpcData?.length || 0,
      };
    }

    // Check 4: Get user's conversations with embeddings
    console.log('🔍 Check 4: Checking user conversations...');
    const { data: convData, error: convError } = await supabase
      .from('conversations')
      .select('id, title, has_embeddings')
      .eq('has_embeddings', true);

    diagnostics.checks.user_conversations = {
      success: !convError,
      conversations_with_embeddings: convData?.length || 0,
      error: convError?.message || null,
    };

    // Check 5: If we have conversations with embeddings, test actual similarity search
    if (convData && convData.length > 0) {
      console.log('🔍 Check 5: Testing similarity search with real data...');
      const conversationIds = convData.map((c) => c.id);

      // Get a sample chunk to use as query (should match itself perfectly)
      const { data: chunkData } = await supabase
        .from('conversation_embeddings')
        .select('embedding, chunk_text')
        .in('conversation_id', conversationIds)
        .limit(1)
        .single();

      if (chunkData && chunkData.embedding) {
        // Use the chunk's own embedding to search - should return itself with similarity ~1.0
        const selfSearchEmbedding = Array.isArray(chunkData.embedding)
          ? `[${chunkData.embedding.join(',')}]`
          : chunkData.embedding;

        const { data: selfMatchData, error: selfMatchError } =
          await supabase.rpc('match_conversation_chunks', {
            query_embedding: selfSearchEmbedding,
            conversation_ids: conversationIds,
            match_threshold: 0.0,
            match_count: 5,
          });

        if (selfMatchError) {
          diagnostics.checks.self_similarity_test = {
            success: false,
            error: selfMatchError.message,
          };
        } else {
          diagnostics.checks.self_similarity_test = {
            success: true,
            results_count: selfMatchData?.length || 0,
            top_similarities: selfMatchData?.slice(0, 3).map((r: any) => ({
              similarity: r.similarity,
              chunk_preview: r.chunk_text?.substring(0, 50) + '...',
            })),
            note:
              'Self-similarity test: Using a chunk embedding to search should return high similarity',
          };
        }
      } else {
        diagnostics.checks.self_similarity_test = {
          success: false,
          error: 'Could not retrieve chunk embedding for self-test',
          embedding_type: typeof chunkData?.embedding,
        };
      }
    }

    // Overall status
    const allPassed = Object.values(diagnostics.checks).every(
      (check: any) => check.success
    );
    diagnostics.overall_status = allPassed ? 'healthy' : 'issues_found';

    if (!allPassed) {
      diagnostics.recommendations = [];

      if (!diagnostics.checks.rpc_function?.success) {
        diagnostics.recommendations.push(
          'Run the migration to create the RPC function: supabase/migrations/004_add_rag_embeddings.sql'
        );
      }

      if (
        diagnostics.checks.vector_data?.success === false &&
        diagnostics.checks.table_access?.success
      ) {
        diagnostics.recommendations.push(
          'Embeddings table exists but no vector data found. Try regenerating embeddings for a conversation.'
        );
      }
    }

    return NextResponse.json(diagnostics);
  } catch (error: any) {
    console.error('Diagnostic error:', error);
    return NextResponse.json(
      {
        error: 'Diagnostic failed',
        message: error.message,
      },
      { status: 500 }
    );
  }
}