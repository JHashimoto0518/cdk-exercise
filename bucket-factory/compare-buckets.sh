#!/bin/bash

# 引数チェック
usage() {
    echo "使用方法: $0 --profile <AWS_PROFILE> <バケット名1> <バケット名2>"
    echo "例: $0 --profile myprofile my-first-bucket my-second-bucket"
    exit 1
}

# オプションの解析
while [[ $# -gt 0 ]]; do
    case $1 in
        --profile)
            AWS_PROFILE="$2"
            shift 2
            ;;
        *)
            break
            ;;
    esac
done

if [ -z "$AWS_PROFILE" ] || [ "$#" -ne 2 ]; then
    usage
fi

BUCKET1="$1"
BUCKET2="$2"
OUTPUT_DIR="bucket_comparison"
AWS_CMD="aws --profile $AWS_PROFILE"

# バケットの存在確認
check_bucket() {
    local bucket=$1
    if ! $AWS_CMD s3api head-bucket --bucket "$bucket" 2>/dev/null; then
        echo "エラー: バケット '$bucket' が存在しないか、アクセスできません。"
        exit 1
    fi
}

echo "バケットの存在を確認中..."
check_bucket "$BUCKET1"
check_bucket "$BUCKET2"

mkdir -p "$OUTPUT_DIR"

# 各バケットの属性を取得する関数
get_bucket_info() {
    local bucket=$1
    local output_file=$2

    echo "バケットの情報を取得中: $bucket"

    # バケット基本情報
    $AWS_CMD s3api get-bucket-acl --bucket "$bucket" > "$output_file.acl.json"
    $AWS_CMD s3api get-bucket-policy --bucket "$bucket" > "$output_file.policy.json" 2>/dev/null || echo "No bucket policy" > "$output_file.policy.json"
    $AWS_CMD s3api get-bucket-versioning --bucket "$bucket" > "$output_file.versioning.json"
    $AWS_CMD s3api get-bucket-encryption --bucket "$bucket" > "$output_file.encryption.json" 2>/dev/null || echo "No encryption" > "$output_file.encryption.json"
    $AWS_CMD s3api get-bucket-lifecycle-configuration --bucket "$bucket" > "$output_file.lifecycle.json" 2>/dev/null || echo "No lifecycle rules" > "$output_file.lifecycle.json"
    $AWS_CMD s3api get-bucket-cors --bucket "$bucket" > "$output_file.cors.json" 2>/dev/null || echo "No CORS configuration" > "$output_file.cors.json"
    $AWS_CMD s3api get-public-access-block --bucket "$bucket" > "$output_file.public-access.json" 2>/dev/null || echo "No public access block" > "$output_file.public-access.json"
    $AWS_CMD s3api get-bucket-logging --bucket "$bucket" > "$output_file.logging.json" 2>/dev/null || echo "No logging configuration" > "$output_file.logging.json"
    $AWS_CMD s3api get-bucket-tagging --bucket "$bucket" > "$output_file.tags.json" 2>/dev/null || echo "No tags" > "$output_file.tags.json"
    $AWS_CMD s3api get-bucket-notification-configuration --bucket "$bucket" > "$output_file.notifications.json"

    # すべての情報を1つのファイルにまとめる
    {
        echo "=== Bucket: $bucket ==="
        echo "=== ACL ==="
        cat "$output_file.acl.json"
        echo -e "\n=== Policy ==="
        cat "$output_file.policy.json"
        echo -e "\n=== Versioning ==="
        cat "$output_file.versioning.json"
        echo -e "\n=== Encryption ==="
        cat "$output_file.encryption.json"
        echo -e "\n=== Lifecycle ==="
        cat "$output_file.lifecycle.json"
        echo -e "\n=== CORS ==="
        cat "$output_file.cors.json"
        echo -e "\n=== Public Access Block ==="
        cat "$output_file.public-access.json"
        echo -e "\n=== Logging ==="
        cat "$output_file.logging.json"
        echo -e "\n=== Tags ==="
        cat "$output_file.tags.json"
        echo -e "\n=== Notifications ==="
        cat "$output_file.notifications.json"
    } > "$output_file.all.txt"

    # 一時ファイルの削除
    rm "$output_file"*.json
}

# 両方のバケットの情報を取得
get_bucket_info "$BUCKET1" "$OUTPUT_DIR/bucket1"
get_bucket_info "$BUCKET2" "$OUTPUT_DIR/bucket2"

echo "比較結果を表示します..."
diff -u "$OUTPUT_DIR/bucket1.all.txt" "$OUTPUT_DIR/bucket2.all.txt" > "$OUTPUT_DIR/differences.diff"

echo "完了しました！"
echo "結果は $OUTPUT_DIR ディレクトリに保存されています"
echo "差分ファイル: $OUTPUT_DIR/differences.diff"
echo "各バケットの詳細: $OUTPUT_DIR/bucket1.all.txt と $OUTPUT_DIR/bucket2.all.txt" 