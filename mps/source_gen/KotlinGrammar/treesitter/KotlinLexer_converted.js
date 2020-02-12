module.exports = grammar({
  name: "KotlinLexer_converted",
  extras: $ => [],
  rules: {
    ShebangLine: $ => token(seq(
      "#!",
      repeat(/[^\r\n]/)
    )),

    DelimitedComment: $ => seq(
      "/*",
      repeat(/.|\n/),
      "*/"
    ),

    LineComment: $ => token(seq(
      "//",
      repeat(/[^\r\n]/)
    )),

    WS: $ => token(/[\u0020\u0009\u000C]/),

    NL: $ => token(choice(
      "\n",
      seq(
        "\r",
        optional("\n")
      )
    )),

    Hidden: $ => choice(
      $.DelimitedComment,
      $.LineComment,
      $.WS
    ),

    RESERVED: $ => token("..."),

    DOT: $ => token("."),

    COMMA: $ => token(","),

    LPAREN: $ => token("("),

    RPAREN: $ => token(")"),

    LSQUARE: $ => token("["),

    RSQUARE: $ => token("]"),

    LCURL: $ => token("{"),

    RCURL: $ => token("}"),

    MULT: $ => token("*"),

    MOD: $ => token("%"),

    DIV: $ => token("/"),

    ADD: $ => token("+"),

    SUB: $ => token("-"),

    INCR: $ => token("++"),

    DECR: $ => token("--"),

    CONJ: $ => token("&&"),

    DISJ: $ => token("||"),

    EXCL_WS: $ => seq(
      "!",
      $.Hidden
    ),

    EXCL_NO_WS: $ => token("!"),

    COLON: $ => token(":"),

    SEMICOLON: $ => token(";"),

    ASSIGNMENT: $ => token("="),

    ADD_ASSIGNMENT: $ => token("+="),

    SUB_ASSIGNMENT: $ => token("-="),

    MULT_ASSIGNMENT: $ => token("*="),

    DIV_ASSIGNMENT: $ => token("/="),

    MOD_ASSIGNMENT: $ => token("%="),

    ARROW: $ => token("->"),

    DOUBLE_ARROW: $ => token("=>"),

    RANGE: $ => token(".."),

    COLONCOLON: $ => token("::"),

    DOUBLE_SEMICOLON: $ => token(";;"),

    HASH: $ => token("#"),

    AT_NO_WS: $ => token("@"),

    AT_POST_WS: $ => seq(
      "@",
      choice(
        $.Hidden,
        $.NL
      )
    ),

    AT_PRE_WS: $ => seq(
      choice(
        $.Hidden,
        $.NL
      ),
      "@"
    ),

    AT_BOTH_WS: $ => seq(
      choice(
        $.Hidden,
        $.NL
      ),
      "@",
      choice(
        $.Hidden,
        $.NL
      )
    ),

    QUEST_WS: $ => seq(
      "?",
      $.Hidden
    ),

    QUEST_NO_WS: $ => token("?"),

    LANGLE: $ => token("<"),

    RANGLE: $ => token(">"),

    LE: $ => token("<="),

    GE: $ => token(">="),

    EXCL_EQ: $ => token("!="),

    EXCL_EQEQ: $ => token("!=="),

    AS_SAFE: $ => token("as?"),

    EQEQ: $ => token("=="),

    EQEQEQ: $ => token("==="),

    SINGLE_QUOTE: $ => token("\'"),

    RETURN_AT: $ => seq(
      "return@",
      $.Identifier
    ),

    CONTINUE_AT: $ => seq(
      "continue@",
      $.Identifier
    ),

    BREAK_AT: $ => seq(
      "break@",
      $.Identifier
    ),

    THIS_AT: $ => seq(
      "this@",
      $.Identifier
    ),

    SUPER_AT: $ => seq(
      "super@",
      $.Identifier
    ),

    FILE: $ => token("file"),

    FIELD: $ => token("field"),

    PROPERTY: $ => token("property"),

    GET: $ => token("get"),

    SET: $ => token("set"),

    RECEIVER: $ => token("receiver"),

    PARAM: $ => token("param"),

    SETPARAM: $ => token("setparam"),

    DELEGATE: $ => token("delegate"),

    PACKAGE: $ => token("package"),

    IMPORT: $ => token("import"),

    CLASS: $ => token("class"),

    INTERFACE: $ => token("interface"),

    FUN: $ => token("fun"),

    OBJECT: $ => token("object"),

    VAL: $ => token("val"),

    VAR: $ => token("var"),

    TYPE_ALIAS: $ => token("typealias"),

    CONSTRUCTOR: $ => token("constructor"),

    BY: $ => token("by"),

    COMPANION: $ => token("companion"),

    INIT: $ => token("init"),

    THIS: $ => token("this"),

    SUPER: $ => token("super"),

    TYPEOF: $ => token("typeof"),

    WHERE: $ => token("where"),

    IF: $ => token("if"),

    ELSE: $ => token("else"),

    WHEN: $ => token("when"),

    TRY: $ => token("try"),

    CATCH: $ => token("catch"),

    FINALLY: $ => token("finally"),

    FOR: $ => token("for"),

    DO: $ => token("do"),

    WHILE: $ => token("while"),

    THROW: $ => token("throw"),

    RETURN: $ => token("return"),

    CONTINUE: $ => token("continue"),

    BREAK: $ => token("break"),

    AS: $ => token("as"),

    IS: $ => token("is"),

    IN: $ => token("in"),

    NOT_IS: $ => seq(
      "!is",
      choice(
        $.Hidden,
        $.NL
      )
    ),

    NOT_IN: $ => seq(
      "!in",
      choice(
        $.Hidden,
        $.NL
      )
    ),

    OUT: $ => token("out"),

    DYNAMIC: $ => token("dynamic"),

    PUBLIC: $ => token("public"),

    PRIVATE: $ => token("private"),

    PROTECTED: $ => token("protected"),

    INTERNAL: $ => token("internal"),

    ENUM: $ => token("enum"),

    SEALED: $ => token("sealed"),

    ANNOTATION: $ => token("annotation"),

    DATA: $ => token("data"),

    INNER: $ => token("inner"),

    TAILREC: $ => token("tailrec"),

    OPERATOR: $ => token("operator"),

    INLINE: $ => token("inline"),

    INFIX: $ => token("infix"),

    EXTERNAL: $ => token("external"),

    SUSPEND: $ => token("suspend"),

    OVERRIDE: $ => token("override"),

    ABSTRACT: $ => token("abstract"),

    FINAL: $ => token("final"),

    OPEN: $ => token("open"),

    CONST: $ => token("const"),

    LATEINIT: $ => token("lateinit"),

    VARARG: $ => token("vararg"),

    NOINLINE: $ => token("noinline"),

    CROSSINLINE: $ => token("crossinline"),

    REIFIED: $ => token("reified"),

    EXPECT: $ => token("expect"),

    ACTUAL: $ => token("actual"),

    DecDigit: $ => token(/[0123456789]/),

    DecDigitNoZero: $ => token(/[123456789]/),

    DecDigitOrSeparator: $ => choice(
      $.DecDigit,
      "_"
    ),

    DecDigits: $ => choice(
      seq(
        $.DecDigit,
        repeat($.DecDigitOrSeparator),
        $.DecDigit
      ),
      $.DecDigit
    ),

    DoubleExponent: $ => seq(
      /[eE]/,
      optional(/[+-]/),
      $.DecDigits
    ),

    RealLiteral: $ => choice(
      $.FloatLiteral,
      $.DoubleLiteral
    ),

    FloatLiteral: $ => choice(
      seq(
        $.DoubleLiteral,
        /[fF]/
      ),
      seq(
        $.DecDigits,
        /[fF]/
      )
    ),

    DoubleLiteral: $ => choice(
      seq(
        optional($.DecDigits),
        ".",
        $.DecDigits,
        optional($.DoubleExponent)
      ),
      seq(
        $.DecDigits,
        $.DoubleExponent
      )
    ),

    IntegerLiteral: $ => choice(
      seq(
        $.DecDigitNoZero,
        repeat($.DecDigitOrSeparator),
        $.DecDigit
      ),
      $.DecDigit
    ),

    HexDigit: $ => token(/[0-9a-fA-F]/),

    HexDigitOrSeparator: $ => choice(
      $.HexDigit,
      "_"
    ),

    HexLiteral: $ => choice(
      seq(
        "0",
        /[xX]/,
        $.HexDigit,
        repeat($.HexDigitOrSeparator),
        $.HexDigit
      ),
      seq(
        "0",
        /[xX]/,
        $.HexDigit
      )
    ),

    BinDigit: $ => token(/[01]/),

    BinDigitOrSeparator: $ => choice(
      $.BinDigit,
      "_"
    ),

    BinLiteral: $ => choice(
      seq(
        "0",
        /[bB]/,
        $.BinDigit,
        repeat($.BinDigitOrSeparator),
        $.BinDigit
      ),
      seq(
        "0",
        /[bB]/,
        $.BinDigit
      )
    ),

    UnsignedLiteral: $ => seq(
      choice(
        $.IntegerLiteral,
        $.HexLiteral,
        $.BinLiteral
      ),
      /[uU]/,
      optional("L")
    ),

    LongLiteral: $ => seq(
      choice(
        $.IntegerLiteral,
        $.HexLiteral,
        $.BinLiteral
      ),
      "L"
    ),

    BooleanLiteral: $ => token(choice(
      "true",
      "false"
    )),

    NullLiteral: $ => token("null"),

    CharacterLiteral: $ => seq(
      "\'",
      choice(
        $.EscapeSeq,
        /[^\n\r'\\]/
      ),
      "\'"
    ),

    UnicodeDigit: $ => $.UNICODE_CLASS_ND,

    Identifier: $ => choice(
      seq(
        choice(
          $.Letter,
          "_"
        ),
        repeat(choice(
          $.Letter,
          "_",
          $.UnicodeDigit
        ))
      ),
      seq(
        "`",
        repeat1(/[^\r\n`]/),
        "`"
      )
    ),

    IdentifierOrSoftKey: $ => choice(
      $.Identifier,
      $.ABSTRACT,
      $.ANNOTATION,
      $.BY,
      $.CATCH,
      $.COMPANION,
      $.CONSTRUCTOR,
      $.CROSSINLINE,
      $.DATA,
      $.DYNAMIC,
      $.ENUM,
      $.EXTERNAL,
      $.FINAL,
      $.FINALLY,
      $.IMPORT,
      $.INFIX,
      $.INIT,
      $.INLINE,
      $.INNER,
      $.INTERNAL,
      $.LATEINIT,
      $.NOINLINE,
      $.OPEN,
      $.OPERATOR,
      $.OUT,
      $.OVERRIDE,
      $.PRIVATE,
      $.PROTECTED,
      $.PUBLIC,
      $.REIFIED,
      $.SEALED,
      $.TAILREC,
      $.VARARG,
      $.WHERE,
      $.GET,
      $.SET,
      $.FIELD,
      $.PROPERTY,
      $.RECEIVER,
      $.PARAM,
      $.SETPARAM,
      $.DELEGATE,
      $.FILE,
      $.EXPECT,
      $.ACTUAL,
      $.CONST,
      $.SUSPEND
    ),

    FieldIdentifier: $ => seq(
      "$",
      $.IdentifierOrSoftKey
    ),

    UniCharacterLiteral: $ => seq(
      "\\",
      "u",
      $.HexDigit,
      $.HexDigit,
      $.HexDigit,
      $.HexDigit
    ),

    EscapedIdentifier: $ => token(seq(
      "\\",
      choice(
        "t",
        "b",
        "r",
        "n",
        "\'",
        "\"",
        "\\",
        "$"
      )
    )),

    EscapeSeq: $ => choice(
      $.UniCharacterLiteral,
      $.EscapedIdentifier
    ),

    Letter: $ => choice(
      $.UNICODE_CLASS_LL,
      $.UNICODE_CLASS_LM,
      $.UNICODE_CLASS_LO,
      $.UNICODE_CLASS_LT,
      $.UNICODE_CLASS_LU,
      $.UNICODE_CLASS_NL
    ),

    QUOTE_OPEN: $ => token("\""),

    TRIPLE_QUOTE_OPEN: $ => token("\"\"\""),

    EOF: $ => token(/[\r\n]/),

    QUOTE_CLOSE: $ => token("\""),

    TRIPLE_QUOTE_CLOSE: $ => token("\"\"\""),

    UNICODE_CLASS_ND: $ => token(/[0-9]/),

    UNICODE_CLASS_LL: $ => token(/[A-Za-z]/),

    UNICODE_CLASS_LM: $ => token("#####################LM"),

    UNICODE_CLASS_LO: $ => token("#####################LO"),

    UNICODE_CLASS_LT: $ => token("#####################LT"),

    UNICODE_CLASS_LU: $ => token("#####################LU"),

    UNICODE_CLASS_NL: $ => token("#####################NL"),

    MultiLineStringQuote: $ => token("#####################1"),

    LineStrText: $ => token("#####################2"),

    LineStrEscapedChar: $ => token("#####################3"),

    LineStrRef: $ => token("#####################4"),

    LineStrExprStart: $ => token("#####################5"),

    MultiLineStrText: $ => token("#####################6"),

    MultiLineStrRef: $ => token("#####################7"),

    MultiLineStrExprStart: $ => token("#####################8"),

    }
});